import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRoleFromRequest } from "@/lib/api-guards";
import { getPresetById } from "@/lib/presets";
import { defaultSessionReview } from "@/lib/session-meta";
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
        executed: z.boolean(),
        taskOwners: z.record(z.string(), z.string()),
        comments: z.array(z.string()),
      })
      .default(defaultSessionReview()),
    analysis: z
      .object({
        index: z.object({
          entities: z.array(z.string()).default([]),
          topics: z.array(z.string()).default([]),
          urgency: z.enum(["low", "medium", "high"]).default("low"),
          openLoops: z.array(z.string()).default([]),
        }),
        verifier: z.object({
          ok: z.boolean().default(true),
          score: z.number().int().min(0).max(100).default(100),
          flags: z.array(z.string()).default([]),
          policy: z.enum(["warn", "repair", "reject"]).default("warn"),
        }),
      })
      .default({
        index: { entities: [], topics: [], urgency: "low", openLoops: [] },
        verifier: { ok: true, score: 100, flags: [], policy: "warn" },
      }),
    approvalEvents: z
      .array(
        z.object({
          id: z.string().trim().min(1),
          sessionId: z.string().trim().min(1),
          action: z.enum(["approve_email", "approve_tasks", "comment", "execute"]),
          actorId: z.string().trim().min(1),
          actorRole: z.enum(["owner", "admin", "agent", "viewer"]),
          timestamp: z.string().trim().min(1),
          note: z.string().trim().optional(),
        }),
      )
      .default([]),
    data: ProcessResponseSchema,
  })
  .strict();

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const { denied } = requireRoleFromRequest(
    request,
    requestId,
    ["agent"],
    "RBAC_SHARE_DENIED",
  );
  if (denied) {
    return denied;
  }

  const raw = (await request.json().catch(() => null)) as unknown;
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          detailsCode: "SHARE_PAYLOAD_INVALID",
          message: "Invalid share payload.",
          requestId,
        },
      },
      { status: 400 },
    );
  }

  const token = createShareToken({
    ...parsed.data,
    presetId: getPresetById(parsed.data.presetId).id,
  });
  return NextResponse.json({ token, requestId });
}
