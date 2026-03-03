import { NextResponse } from "next/server";

import { requireRoleFromRequest, requireWave1 } from "@/lib/api-guards";
import { getAppConfig } from "@/lib/config";
import { getSessionById } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const featureBlocked = requireWave1(requestId);
  if (featureBlocked) {
    return featureBlocked;
  }

  const { session, denied } = requireRoleFromRequest(
    request,
    requestId,
    ["viewer"],
    "RBAC_HISTORY_COMPARE_DENIED",
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
          detailsCode: "COMPARE_DB_REQUIRED",
          message: "History compare API is available only when HISTORY_MODE=db.",
          requestId,
        },
      },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const idA = url.searchParams.get("idA");
  const idB = url.searchParams.get("idB");
  if (!idA || !idB) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          detailsCode: "COMPARE_IDS_MISSING",
          message: "Query params idA and idB are required.",
          requestId,
        },
      },
      { status: 400 },
    );
  }

  const [a, b] = await Promise.all([getSessionById(idA), getSessionById(idB)]);
  if (!a || !b || a.workspace_id !== session.workspaceId || b.workspace_id !== session.workspaceId) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          detailsCode: "COMPARE_SESSION_NOT_FOUND",
          message: "One or both sessions were not found.",
          requestId,
        },
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    idA,
    idB,
    comparison: {
      summaryChanged: a.summary !== b.summary,
      actionCountDelta: (b.tasks?.length ?? 0) - (a.tasks?.length ?? 0),
      topicsA: a.session_index?.topics ?? [],
      topicsB: b.session_index?.topics ?? [],
      urgencyA: a.session_index?.urgency ?? "low",
      urgencyB: b.session_index?.urgency ?? "low",
      verifierScoreA: a.verifier_report?.score ?? null,
      verifierScoreB: b.verifier_report?.score ?? null,
    },
  });
}
