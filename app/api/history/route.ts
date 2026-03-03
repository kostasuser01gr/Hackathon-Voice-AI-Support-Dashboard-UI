import { NextResponse } from "next/server";

import { requireRoleFromRequest } from "@/lib/api-guards";
import { getAppConfig } from "@/lib/config";
import { listSessions } from "@/lib/db";
import { DEFAULT_PRESET_ID } from "@/lib/presets";
import { defaultSessionReview } from "@/lib/session-meta";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const { session, denied } = requireRoleFromRequest(
    request,
    requestId,
    ["viewer"],
    "RBAC_HISTORY_READ_DENIED",
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

  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? undefined;
  const modeParam = url.searchParams.get("mode");
  const mode = modeParam === "voice" || modeParam === "text" ? modeParam : "all";

  const rows = await listSessions({
    search,
    mode,
    workspaceId: session.workspaceId,
  });

  return NextResponse.json({
    requestId,
    sessions: rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      workspaceId: row.workspace_id,
      userId: row.user_id,
      inputMode: row.input_mode,
      summarySnippet: row.summary.slice(0, 160),
      actionCount: Array.isArray(row.tasks) ? row.tasks.length : 0,
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
    })),
  });
}
