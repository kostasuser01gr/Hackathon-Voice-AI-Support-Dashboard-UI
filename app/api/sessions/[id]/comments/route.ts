import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRoleFromRequest, requireWave1 } from "@/lib/api-guards";
import { getAppConfig } from "@/lib/config";
import { appendApprovalEvent, getSessionById, updateSessionReview } from "@/lib/db";
import { makeApprovalEvent } from "@/lib/session-meta";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

const BodySchema = z
  .object({
    note: z.string().trim().min(1).max(300),
  })
  .strict();

export async function POST(request: Request, context: RouteParams) {
  const requestId = crypto.randomUUID();
  const featureBlocked = requireWave1(requestId);
  if (featureBlocked) {
    return featureBlocked;
  }

  const { session, denied } = requireRoleFromRequest(
    request,
    requestId,
    ["viewer"],
    "RBAC_SESSION_COMMENT_DENIED",
  );
  if (denied) {
    return denied;
  }

  const config = getAppConfig();
  if (config.historyMode !== "db") {
    return NextResponse.json(
      {
        error: {
          code: "HISTORY_MODE_LOCAL",
          detailsCode: "COMMENTS_DB_REQUIRED",
          message: "Comments endpoint requires HISTORY_MODE=db.",
          requestId,
        },
      },
      { status: 400 },
    );
  }

  const payload = (await request.json().catch(() => null)) as unknown;
  const parsed = BodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          detailsCode: "COMMENT_PAYLOAD_INVALID",
          message: "Invalid comment payload.",
          requestId,
        },
      },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const row = await getSessionById(id);
  if (!row || row.workspace_id !== session.workspaceId) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          detailsCode: "SESSION_NOT_FOUND_OR_FORBIDDEN",
          message: "Session not found.",
          requestId,
        },
      },
      { status: 404 },
    );
  }

  const review = {
    ...row.review,
    comments: [parsed.data.note, ...(row.review?.comments ?? [])].slice(0, 20),
  };
  const event = makeApprovalEvent({
    sessionId: row.id,
    actorId: session.userId,
    actorRole: session.role,
    action: "comment",
    note: parsed.data.note,
  });

  await updateSessionReview(row.id, review);
  await appendApprovalEvent(row.id, event);

  return NextResponse.json({
    ok: true,
    review,
    event,
  });
}
