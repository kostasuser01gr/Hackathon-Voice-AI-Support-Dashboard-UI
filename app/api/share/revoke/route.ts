import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRoleAndWorkspaceFromRequest } from "@/lib/api-guards";
import { revokeShareTokenByToken } from "@/lib/share";

export const runtime = "nodejs";

const BodySchema = z
  .object({
    token: z.string().trim().min(20),
    reason: z.string().trim().max(200).optional(),
  })
  .strict();

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const correlationId = request.headers.get("x-correlation-id") ?? requestId;

  const { denied } = await requireRoleAndWorkspaceFromRequest(
    request,
    requestId,
    ["agent"],
    "RBAC_SHARE_REVOKE_DENIED",
  );
  if (denied) {
    denied.headers.set("x-correlation-id", correlationId);
    return denied;
  }

  const raw = (await request.json().catch(() => null)) as unknown;
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          detailsCode: "SHARE_REVOKE_PAYLOAD_INVALID",
          message: "Invalid revoke payload.",
          requestId,
        },
      },
      { status: 400, headers: { "x-correlation-id": correlationId } },
    );
  }

  await revokeShareTokenByToken(parsed.data.token, parsed.data.reason);
  return NextResponse.json(
    { ok: true, requestId },
    { headers: { "x-correlation-id": correlationId } },
  );
}
