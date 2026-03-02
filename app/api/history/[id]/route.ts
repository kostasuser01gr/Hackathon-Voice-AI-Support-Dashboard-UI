import { NextResponse } from "next/server";

import { getAppConfig } from "@/lib/config";
import { getSessionById } from "@/lib/db";
import { DEFAULT_PRESET_ID } from "@/lib/presets";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteParams) {
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

  const { id } = await context.params;
  const row = await getSessionById(id);

  if (!row) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Session not found.",
        },
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    session: {
      id: row.id,
      createdAt: row.created_at,
      inputMode: row.input_mode,
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
    },
  });
}
