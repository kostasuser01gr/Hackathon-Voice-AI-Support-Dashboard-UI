import { NextResponse } from "next/server";

import { requireRoleAndWorkspaceFromRequest, requireWave1 } from "@/lib/api-guards";
import { getIntegrationJobWithFallback } from "@/lib/jobQueue";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  const requestId = crypto.randomUUID();
  const correlationId = request.headers.get("x-correlation-id") ?? requestId;
  const featureBlocked = requireWave1(requestId);
  if (featureBlocked) {
    return featureBlocked;
  }

  const { session, denied } = await requireRoleAndWorkspaceFromRequest(
    request,
    requestId,
    ["viewer"],
    "RBAC_INTEGRATION_JOB_READ_DENIED",
  );
  if (denied) {
    denied.headers.set("x-correlation-id", correlationId);
    return denied;
  }

  const { id } = await context.params;
  const job = await getIntegrationJobWithFallback(id);

  if (!job || job.workspaceId !== session.workspaceId) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          detailsCode: "INTEGRATION_JOB_NOT_FOUND",
          message: "Job not found.",
          requestId,
        },
      },
      { status: 404, headers: { "x-correlation-id": correlationId } },
    );
  }

  return NextResponse.json(
    {
      job,
      requestId,
    },
    { headers: { "x-correlation-id": correlationId } },
  );
}
