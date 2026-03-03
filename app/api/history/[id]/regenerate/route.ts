import { NextResponse } from "next/server";

import { processPayload } from "@/app/api/process/route";
import { requireRoleFromRequest, requireWave1 } from "@/lib/api-guards";
import { getAppConfig } from "@/lib/config";
import { getSessionById } from "@/lib/db";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteParams) {
  const requestId = crypto.randomUUID();
  const featureBlocked = requireWave1(requestId);
  if (featureBlocked) {
    return featureBlocked;
  }

  const { session, denied } = requireRoleFromRequest(
    request,
    requestId,
    ["agent"],
    "RBAC_HISTORY_REGENERATE_DENIED",
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
          detailsCode: "REGENERATE_DB_REQUIRED",
          message: "Regenerate endpoint is available only when HISTORY_MODE=db.",
          requestId,
        },
      },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const source = await getSessionById(id);
  if (!source || source.workspace_id !== session.workspaceId) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          detailsCode: "REGENERATE_SESSION_NOT_FOUND",
          message: "Source session not found.",
          requestId,
        },
      },
      { status: 404 },
    );
  }

  const regenerated = await processPayload(
    {
      inputMode: source.input_mode,
      text: source.transcript,
    },
    {
      requestId,
    },
  );

  return NextResponse.json(regenerated);
}
