import { NextResponse } from "next/server";

import { getAppConfig } from "@/lib/config";
import { isDbHistoryEnabled, isUserInWorkspace } from "@/lib/db";
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

export function requireV2Apis(requestId: string) {
  const config = getAppConfig();
  if (!config.featureV2Apis) {
    return NextResponse.json(
      {
        error: {
          code: "FEATURE_DISABLED",
          detailsCode: "V2_APIS_DISABLED",
          message: "API v2 endpoints are disabled.",
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

export async function requireRoleAndWorkspaceFromRequest(
  request: Request,
  requestId: string,
  roles: Array<"owner" | "admin" | "agent" | "viewer">,
  detailsCode: string,
) {
  const base = requireRoleFromRequest(request, requestId, roles, detailsCode);
  if (base.denied) {
    return base;
  }

  if (!isDbHistoryEnabled()) {
    return base;
  }

  const allowed = await isUserInWorkspace(base.session.workspaceId, base.session.userId);
  if (!allowed) {
    return {
      session: base.session,
      denied: NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            detailsCode: "RBAC_WORKSPACE_MEMBERSHIP_REQUIRED",
            message: "User is not a member of this workspace.",
            requestId,
          },
        },
        { status: 403 },
      ),
    };
  }

  return base;
}
