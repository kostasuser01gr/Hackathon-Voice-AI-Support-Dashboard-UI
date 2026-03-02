import { NextResponse } from "next/server";
import { z } from "zod";

import { enqueueIntegrationJob } from "@/lib/jobQueue";

const BodySchema = z
  .object({
    service: z.enum(["gmail", "calendar", "jira_zendesk"]),
    mode: z.enum(["dry_run", "connect_stub"]).default("dry_run"),
    payload: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export const runtime = "nodejs";

export async function POST(request: Request) {
  const raw = (await request.json().catch(() => null)) as unknown;
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "Invalid integration request payload.",
        },
      },
      { status: 400 },
    );
  }

  const job = enqueueIntegrationJob(parsed.data);
  return NextResponse.json({ job }, { status: 202 });
}
