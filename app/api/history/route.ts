import { NextResponse } from "next/server";

import { getAppConfig } from "@/lib/config";
import { listSessions } from "@/lib/db";
import { DEFAULT_PRESET_ID } from "@/lib/presets";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const config = getAppConfig();
  if (config.historyMode !== "db") {
    return NextResponse.json(
      {
        error: {
          code: "HISTORY_MODE_LOCAL",
          message: "History API is only available when HISTORY_MODE=db.",
        },
      },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search") ?? undefined;
  const modeParam = url.searchParams.get("mode");
  const mode = modeParam === "voice" || modeParam === "text" ? modeParam : "all";

  const rows = await listSessions({ search, mode });

  return NextResponse.json({
    sessions: rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      inputMode: row.input_mode,
      summarySnippet: row.summary.slice(0, 160),
      actionCount: Array.isArray(row.tasks) ? row.tasks.length : 0,
      presetId: DEFAULT_PRESET_ID,
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
