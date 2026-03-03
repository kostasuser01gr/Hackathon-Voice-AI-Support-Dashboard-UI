import { NextResponse } from "next/server";

import { requireRoleFromRequest } from "@/lib/api-guards";
import { evaluateGuardianNow, getGuardianSnapshot, startRuntimeGuardian } from "@/lib/guardian";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const { denied } = requireRoleFromRequest(
    request,
    requestId,
    ["viewer"],
    "RBAC_GUARDIAN_READ_DENIED",
  );
  if (denied) {
    return denied;
  }

  startRuntimeGuardian();

  return NextResponse.json({
    requestId,
    guardian: getGuardianSnapshot(),
  });
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const { denied } = requireRoleFromRequest(
    request,
    requestId,
    ["admin"],
    "RBAC_GUARDIAN_EVAL_DENIED",
  );
  if (denied) {
    return denied;
  }

  const snapshot = evaluateGuardianNow();
  return NextResponse.json({
    requestId,
    guardian: snapshot,
    message: "Guardian evaluation executed.",
  });
}
