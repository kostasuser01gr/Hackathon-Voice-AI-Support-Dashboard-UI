import { NextResponse } from "next/server";

import { requireRoleAndWorkspaceFromRequest, requireWave1 } from "@/lib/api-guards";
import {
  acquireIdempotencyLock,
  buildIdempotencyScopeKey,
  getIdempotencyKeyFromRequest,
  loadIdempotentResponse,
  releaseIdempotencyLock,
  storeIdempotentResponse,
} from "@/lib/idempotency";
import { retryIntegrationJobWithFallback } from "@/lib/jobQueue";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteParams) {
  const requestId = crypto.randomUUID();
  const correlationId = request.headers.get("x-correlation-id") ?? requestId;
  const featureBlocked = requireWave1(requestId);
  if (featureBlocked) {
    return featureBlocked;
  }

  const { session, denied } = await requireRoleAndWorkspaceFromRequest(
    request,
    requestId,
    ["agent"],
    "RBAC_INTEGRATION_RETRY_DENIED",
  );
  if (denied) {
    denied.headers.set("x-correlation-id", correlationId);
    return denied;
  }

  const idempotencyKey = getIdempotencyKeyFromRequest(request);
  const configRequireIdempotency = process.env.MUTATION_IDEMPOTENCY_REQUIRED === "true";
  if (configRequireIdempotency && !idempotencyKey) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          detailsCode: "IDEMPOTENCY_KEY_REQUIRED",
          message: "Idempotency-Key header is required for this endpoint.",
          requestId,
        },
      },
      { status: 400, headers: { "x-correlation-id": correlationId } },
    );
  }

  const { id } = await context.params;
  const idempotencyScope = idempotencyKey
    ? buildIdempotencyScopeKey({
        route: `api.integrations.retry.${id}`,
        workspaceId: session.workspaceId,
        userId: session.userId,
        key: idempotencyKey,
      })
    : null;
  let hasIdempotencyLock = false;
  if (idempotencyScope) {
    const replay = await loadIdempotentResponse(idempotencyScope);
    if (replay) {
      const response = NextResponse.json(replay.body, {
        status: replay.status,
        headers: replay.headers,
      });
      response.headers.set("x-idempotent-replay", "true");
      response.headers.set("x-correlation-id", correlationId);
      return response;
    }
    const acquired = await acquireIdempotencyLock(idempotencyScope);
    if (!acquired) {
      return NextResponse.json(
        {
          error: {
            code: "IDEMPOTENCY_IN_PROGRESS",
            detailsCode: "IDEMPOTENCY_LOCKED",
            message: "Another request with this idempotency key is still processing.",
            requestId,
          },
        },
        { status: 409, headers: { "x-correlation-id": correlationId } },
      );
    }
    hasIdempotencyLock = true;
  }

  try {
    const retried = await retryIntegrationJobWithFallback(id, {
      workspaceId: session.workspaceId,
      userId: session.userId,
    });

    if (!retried) {
      const response = NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            detailsCode: "INTEGRATION_JOB_NOT_FOUND",
            message: "Integration job not found.",
            requestId,
          },
        },
        { status: 404, headers: { "x-correlation-id": correlationId } },
      );
      if (idempotencyScope) {
        await storeIdempotentResponse(idempotencyScope, {
          status: response.status,
          body: await response.clone().json(),
          storedAt: new Date().toISOString(),
        });
      }
      return response;
    }

    const response = NextResponse.json(
      {
        job: retried,
        requestId,
      },
      { status: 202, headers: { "x-correlation-id": correlationId } },
    );
    if (idempotencyScope) {
      await storeIdempotentResponse(idempotencyScope, {
        status: response.status,
        body: await response.clone().json(),
        storedAt: new Date().toISOString(),
      });
    }
    return response;
  } finally {
    if (idempotencyScope && hasIdempotencyLock) {
      await releaseIdempotencyLock(idempotencyScope);
    }
  }
}
