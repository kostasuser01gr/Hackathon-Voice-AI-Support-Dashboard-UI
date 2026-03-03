import { NextResponse } from "next/server";

import { requireRoleFromRequest } from "@/lib/api-guards";
import { getObservabilitySnapshot } from "@/lib/observability";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const { denied } = requireRoleFromRequest(
    request,
    requestId,
    ["viewer"],
    "RBAC_METRICS_DENIED",
  );
  if (denied) {
    return denied;
  }

  return NextResponse.json({
    requestId,
    timestamp: new Date().toISOString(),
    observability: getObservabilitySnapshot(),
  });
}
