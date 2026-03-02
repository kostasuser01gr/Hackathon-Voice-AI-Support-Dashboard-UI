import { NextResponse } from "next/server";
import { z } from "zod";

import { getPresetById } from "@/lib/presets";
import { createShareToken } from "@/lib/share";
import { ProcessResponseSchema } from "@/lib/schema";

const BodySchema = z
  .object({
    id: z.string().trim().min(1),
    createdAt: z.string().trim().min(1),
    workspaceId: z.string().trim().min(1),
    presetId: z.string().trim().min(1),
    pinned: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    review: z
      .object({
        emailApproved: z.boolean(),
        tasksApproved: z.boolean(),
        taskOwners: z.record(z.string(), z.string()),
        comments: z.array(z.string()),
      })
      .default({
        emailApproved: false,
        tasksApproved: false,
        taskOwners: {},
        comments: [],
      }),
    data: ProcessResponseSchema,
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
          message: "Invalid share payload.",
        },
      },
      { status: 400 },
    );
  }

  const token = createShareToken({
    ...parsed.data,
    presetId: getPresetById(parsed.data.presetId).id,
  });
  return NextResponse.json({ token });
}
