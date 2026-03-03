import { NextResponse } from "next/server";

import { getAppConfig } from "@/lib/config";
import { ensureRole } from "@/lib/rbac";
import { getSessionFromRequest } from "@/lib/request-session";

export function requireWave1(requestId: string) {
  const config = getAppConfig();
  if (!config.featureWave1) {
    return NextResponse.json(
      {
        error: {
          code: "FEATURE_DISABLED",
          detailsCode: "WAVE1_DISABLED",
          message: "This endpoint is disabled.",
          requestId,
        },
      },
      { status: 404 },
    );
  }

  return null;
}

export function requireRoleFromRequest(
  request: Request,
  requestId: string,
  roles: Array<"owner" | "admin" | "agent" | "viewer">,
  detailsCode: string,
) {
  const session = getSessionFromRequest(request);
  const denied = ensureRole(session, roles, requestId, detailsCode);
  return {
    session,
    denied,
  };
}
