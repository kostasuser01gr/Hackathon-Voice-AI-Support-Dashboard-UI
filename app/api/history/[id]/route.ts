import { NextResponse } from "next/server";

import { requireRoleFromRequest } from "@/lib/api-guards";
import { getAppConfig } from "@/lib/config";
import { getSessionById } from "@/lib/db";
import { DEFAULT_PRESET_ID } from "@/lib/presets";
import { defaultSessionReview } from "@/lib/session-meta";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  const requestId = crypto.randomUUID();
  const { session, denied } = requireRoleFromRequest(
    request,
    requestId,
    ["viewer"],
    "RBAC_HISTORY_DETAIL_DENIED",
  );
  if (denied) {
    return denied;
  }

  const config = getAppConfig();
  if (config.historyMode !== "db") {
    return NextResponse.json(
      {
        error: {
          code: "HISTORY_MODE_LOCAL",
          detailsCode: "HISTORY_DB_REQUIRED",
          message: "History API is only available when HISTORY_MODE=db.",
          requestId,
        },
      },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const row = await getSessionById(id);

  if (!row || row.workspace_id !== session.workspaceId) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          detailsCode: "HISTORY_SESSION_NOT_FOUND",
          message: "Session not found.",
          requestId,
        },
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    session: {
      id: row.id,
      createdAt: row.created_at,
      workspaceId: row.workspace_id,
      userId: row.user_id,
      inputMode: row.input_mode,
      presetId: DEFAULT_PRESET_ID,
      review: row.review ?? defaultSessionReview(),
      analysis: row.session_index && row.verifier_report
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
    },
  });
}
