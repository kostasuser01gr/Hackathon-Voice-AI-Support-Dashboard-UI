import { NextResponse } from "next/server";

import type { SessionData, SessionRole } from "@/lib/auth";

const ROLE_RANK: Record<SessionRole, number> = {
  viewer: 0,
  agent: 1,
  admin: 2,
  owner: 3,
};

export function hasRole(
  currentRole: SessionRole,
  requiredRoles: SessionRole[],
) {
  const currentRank = ROLE_RANK[currentRole] ?? 0;
  return requiredRoles.some((role) => currentRank >= ROLE_RANK[role]);
}

export function forbiddenResponse(requestId: string, detailsCode = "RBAC_FORBIDDEN") {
  return NextResponse.json(
    {
      error: {
        code: "FORBIDDEN",
        detailsCode,
        message: "You do not have permission for this action.",
        requestId,
      },
    },
    { status: 403 },
  );
}

export function ensureRole(
  session: SessionData,
  requiredRoles: SessionRole[],
  requestId: string,
  detailsCode?: string,
) {
  if (!hasRole(session.role, requiredRoles)) {
    return forbiddenResponse(requestId, detailsCode);
  }

  return null;
}
