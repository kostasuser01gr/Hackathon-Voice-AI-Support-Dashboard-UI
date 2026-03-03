import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRoleFromRequest, requireWave1 } from "@/lib/api-guards";
import { getAppConfig } from "@/lib/config";
import { enqueueIntegrationExecution } from "@/lib/jobQueue";

const BodySchema = z
  .object({
    service: z.enum(["gmail", "calendar", "jira_zendesk"]),
    mode: z.enum(["dry_run", "connect_stub"]).default("dry_run"),
    payload: z.record(z.string(), z.unknown()).default({}),
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
    "RBAC_INTEGRATION_DRY_RUN_DENIED",
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
          detailsCode: "INTEGRATION_DRY_RUN_BAD_PAYLOAD",
          message: "Invalid integration request payload.",
          requestId,
        },
      },
      { status: 400 },
    );
  }

  const config = getAppConfig();
  const mappedAction = parsed.data.mode === "connect_stub" ? "connect_stub" : "dry_run";
  const enqueued = enqueueIntegrationExecution(
    {
      service: parsed.data.service,
      action: mappedAction,
      payload: parsed.data.payload,
      mode: config.integrationsMode,
    },
    {
      workspaceId: session.workspaceId,
      userId: session.userId,
    },
  );
  return NextResponse.json(
    {
      job: enqueued.job,
      reused: enqueued.reused,
      requestId,
    },
    { status: 202 },
  );
}
