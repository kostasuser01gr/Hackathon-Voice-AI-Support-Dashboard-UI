import { NextResponse } from "next/server";

import { getIntegrationJob } from "@/lib/jobQueue";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteParams) {
  const { id } = await context.params;
  const job = getIntegrationJob(id);

  if (!job) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Job not found.",
        },
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ job });
}
