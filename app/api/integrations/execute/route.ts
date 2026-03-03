import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRoleFromRequest, requireWave1 } from "@/lib/api-guards";
import { getAppConfig } from "@/lib/config";
import { appendApprovalEvent, getSessionById, updateSessionReview } from "@/lib/db";
import { enqueueIntegrationExecution } from "@/lib/jobQueue";
import { logServerEvent } from "@/lib/observability";
import { makeApprovalEvent } from "@/lib/session-meta";

const BodySchema = z
  .object({
    service: z.enum(["gmail", "calendar", "jira_zendesk"]),
    action: z.enum(["dry_run", "connect_stub", "execute"]).default("dry_run"),
    sessionId: z.string().uuid().optional(),
    payload: z.record(z.string(), z.unknown()).default({}),
    idempotencyKey: z.string().trim().min(4).max(128).optional(),
  })
  .strict();

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const featureBlocked = requireWave1(requestId);
  if (featureBlocked) {
    return featureBlocked;
  }

  const { session, denied } = requireRoleFromRequest(
    request,
    requestId,
    ["agent"],
    "RBAC_INTEGRATION_EXECUTE_DENIED",
  );
  if (denied) {
    return denied;
  }

  const raw = (await request.json().catch(() => null)) as unknown;
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          detailsCode: "INTEGRATION_EXECUTE_BAD_PAYLOAD",
          message: "Invalid integration execute payload.",
          requestId,
        },
      },
      { status: 400 },
    );
  }

  const config = getAppConfig();
  const payload = parsed.data;

  if (payload.action === "execute" && payload.sessionId) {
    if (config.historyMode !== "db") {
      return NextResponse.json(
        {
          error: {
            code: "HISTORY_MODE_LOCAL",
            detailsCode: "INTEGRATION_EXECUTION_DB_REQUIRED",
            message: "Execution approval gating requires HISTORY_MODE=db.",
            requestId,
          },
        },
        { status: 400 },
      );
    }

    const sourceSession = await getSessionById(payload.sessionId);
    if (!sourceSession || sourceSession.workspace_id !== session.workspaceId) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            detailsCode: "INTEGRATION_SESSION_NOT_FOUND",
            message: "Session not found in this workspace.",
            requestId,
          },
        },
        { status: 404 },
      );
    }

    const review = sourceSession.review;
    if (!review?.emailApproved || !review?.tasksApproved) {
      return NextResponse.json(
        {
          error: {
            code: "APPROVAL_REQUIRED",
            detailsCode: "INTEGRATION_EXECUTION_BLOCKED_UNAPPROVED",
            message:
              "Execution blocked until both tasks and email are approved for this session.",
            requestId,
          },
        },
        { status: 409 },
      );
    }

    try {
      const executeEvent = makeApprovalEvent({
        sessionId: sourceSession.id,
        actorId: session.userId,
        actorRole: session.role,
        action: "execute",
        note: `Integration execute requested for ${payload.service}.`,
      });
      await appendApprovalEvent(sourceSession.id, executeEvent);
      await updateSessionReview(sourceSession.id, {
        ...review,
        executed: true,
      });
    } catch (error) {
      logServerEvent("warn", "integrations.execute.review_update_failed", {
        requestId,
        sessionId: payload.sessionId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const execution = enqueueIntegrationExecution(
    {
      service: payload.service,
      action: payload.action,
      sessionId: payload.sessionId,
      payload: payload.payload,
      idempotencyKey: payload.idempotencyKey,
      mode: config.integrationsMode,
    },
    {
      workspaceId: session.workspaceId,
      userId: session.userId,
    },
  );

  return NextResponse.json(
    {
      job: execution.job,
      reused: execution.reused,
      requestId,
    },
    { status: 202 },
  );
}

