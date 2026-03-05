import { NextResponse } from "next/server";

import { getIntegrationJobWithFallback, runIntegrationJobById } from "@/lib/jobQueue";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

function isAuthorized(request: Request) {
  const configured = process.env.CLOUD_TASKS_AUTH_TOKEN?.trim();
  if (!configured) {
    return true;
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return false;
  }

  return header.slice("Bearer ".length).trim() === configured;
}

export async function POST(request: Request, context: RouteParams) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        error: {
          code: "FORBIDDEN",
          detailsCode: "WORKER_AUTH_INVALID",
          message: "Invalid worker authorization token.",
        },
      },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  const existing = await getIntegrationJobWithFallback(id);
  if (!existing) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          detailsCode: "INTEGRATION_JOB_NOT_FOUND",
          message: "Job not found.",
        },
      },
      { status: 404 },
    );
  }

  const updated = await runIntegrationJobById(id);
  return NextResponse.json({
    job: updated ?? existing,
    ok: true,
  });
}
