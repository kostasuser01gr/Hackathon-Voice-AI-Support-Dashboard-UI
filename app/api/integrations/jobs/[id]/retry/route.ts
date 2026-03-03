import { NextResponse } from "next/server";

import { requireRoleFromRequest, requireWave1 } from "@/lib/api-guards";
import { retryIntegrationJob } from "@/lib/jobQueue";

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
    "RBAC_INTEGRATION_RETRY_DENIED",
  );
  if (denied) {
    return denied;
  }

  const { id } = await context.params;
  const retried = retryIntegrationJob(id, {
    workspaceId: session.workspaceId,
    userId: session.userId,
  });

  if (!retried) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          detailsCode: "INTEGRATION_JOB_NOT_FOUND",
          message: "Integration job not found.",
          requestId,
        },
      },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      job: retried,
      requestId,
    },
    { status: 202 },
  );
}

