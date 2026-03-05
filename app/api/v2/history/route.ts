import { NextResponse } from "next/server";

import {
  requireRoleAndWorkspaceFromRequest,
  requireV2Apis,
} from "@/lib/api-guards";
import { jsonError } from "@/lib/api-response";
import { getAppConfig } from "@/lib/config";
import { listSessionsV2 } from "@/lib/db";
import { DEFAULT_PRESET_ID } from "@/lib/presets";
import { defaultSessionReview } from "@/lib/session-meta";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const correlationId = request.headers.get("x-correlation-id") ?? requestId;

  const v2Blocked = requireV2Apis(requestId);
  if (v2Blocked) {
    return v2Blocked;
  }

  const { session, denied } = await requireRoleAndWorkspaceFromRequest(
    request,
    requestId,
    ["viewer"],
    "RBAC_HISTORY_READ_DENIED",
  );
  if (denied) {
    denied.headers.set("x-correlation-id", correlationId);
    return denied;
  }

  const config = getAppConfig();
  if (config.historyMode !== "db") {
    return jsonError({
      status: 400,
      code: "HISTORY_MODE_LOCAL",
      detailsCode: "HISTORY_DB_REQUIRED",
      message: "History API is only available when HISTORY_MODE=db.",
      requestId,
      correlationId,
    });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? undefined;
  const modeParam = url.searchParams.get("mode");
  const mode = modeParam === "voice" || modeParam === "text" ? modeParam : "all";
  const cursor = url.searchParams.get("cursor");
  const pageSize = Number.parseInt(url.searchParams.get("pageSize") ?? "25", 10);

  const page = await listSessionsV2({
    search,
    mode,
    workspaceId: session.workspaceId,
    userId: undefined,
    cursor,
    pageSize,
  });

  const response = NextResponse.json({
    requestId,
    correlationId,
    pagination: {
      pageSize: Math.max(1, Math.min(pageSize, 100)),
      nextCursor: page.nextCursor,
    },
    items: page.items.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      workspaceId: row.workspace_id,
      userId: row.user_id,
      inputMode: row.input_mode,
      summarySnippet: row.summary.slice(0, 160),
      actionCount: Array.isArray(row.tasks) ? row.tasks.length : 0,
      presetId: DEFAULT_PRESET_ID,
      review: row.review ?? defaultSessionReview(),
      analysis:
        row.session_index && row.verifier_report
          ? {
              index: row.session_index,
              verifier: row.verifier_report,
            }
          : undefined,
      approvalEvents: Array.isArray(row.approval_events) ? row.approval_events : [],
      data: {
        inputMode: row.input_mode,
        transcript: row.transcript,
        summary: row.summary,
        actions: {
          taskList: row.tasks,
          emailDraft: row.email_draft,
        },
        auditTrail: row.audit_trail,
        meta: row.meta,
      },
    })),
  });
  response.headers.set("x-correlation-id", correlationId);
  return response;
}
