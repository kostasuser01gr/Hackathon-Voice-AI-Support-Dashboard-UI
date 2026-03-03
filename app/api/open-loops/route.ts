import { NextResponse } from "next/server";

import { requireRoleFromRequest, requireWave1 } from "@/lib/api-guards";
import { getAppConfig } from "@/lib/config";
import { listOpenLoops } from "@/lib/db";

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
    "RBAC_OPEN_LOOPS_DENIED",
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
          detailsCode: "OPEN_LOOPS_DB_REQUIRED",
          message: "Open loops endpoint requires HISTORY_MODE=db.",
          requestId,
        },
      },
      { status: 400 },
    );
  }

  const loops = await listOpenLoops({ workspaceId: session.workspaceId, limit: 200 });
  return NextResponse.json({
    count: loops.length,
    loops,
  });
}
