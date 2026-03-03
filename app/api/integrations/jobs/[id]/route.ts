import { NextResponse } from "next/server";

import { requireRoleFromRequest, requireWave1 } from "@/lib/api-guards";
import { getIntegrationJob } from "@/lib/jobQueue";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  const requestId = crypto.randomUUID();
  const featureBlocked = requireWave1(requestId);
  if (featureBlocked) {
    return featureBlocked;
  }

  const { session, denied } = requireRoleFromRequest(
    request,
    requestId,
    ["viewer"],
    "RBAC_INTEGRATION_JOB_READ_DENIED",
  );
  if (denied) {
    return denied;
  }

  const { id } = await context.params;
  const job = getIntegrationJob(id);

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
      { status: 404 },
    );
  }

  return NextResponse.json({
    job,
    requestId,
  });
}
