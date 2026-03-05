import { getRuntimeStateAdapter } from "@/lib/runtime-state";

const DEFAULT_RESPONSE_TTL_SECONDS = 60 * 60 * 24;
const DEFAULT_LOCK_TTL_SECONDS = 60;

export type StoredIdempotentResponse = {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
  storedAt: string;
};

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9:_-]/g, "_");
}

export function getIdempotencyKeyFromRequest(request: Request) {
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key) {
    return null;
  }
  if (key.length < 4 || key.length > 128) {
    return null;
  }
  return key;
}

export function buildIdempotencyScopeKey(params: {
  route: string;
  workspaceId: string;
  userId: string;
  key: string;
}) {
  return [
    "idem",
    sanitizeSegment(params.route),
    sanitizeSegment(params.workspaceId),
    sanitizeSegment(params.userId),
    sanitizeSegment(params.key),
  ].join(":");
}

function responseKey(scopeKey: string) {
  return `${scopeKey}:response`;
}

function lockKey(scopeKey: string) {
  return `${scopeKey}:lock`;
}

export async function loadIdempotentResponse(scopeKey: string) {
  const raw = await getRuntimeStateAdapter().get(responseKey(scopeKey));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredIdempotentResponse;
    if (
      typeof parsed.status !== "number" ||
      typeof parsed.storedAt !== "string" ||
      parsed.body === undefined
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function acquireIdempotencyLock(
  scopeKey: string,
  ttlSeconds = DEFAULT_LOCK_TTL_SECONDS,
) {
  return getRuntimeStateAdapter().setIfAbsent(lockKey(scopeKey), "1", ttlSeconds);
}

export async function releaseIdempotencyLock(scopeKey: string) {
  await getRuntimeStateAdapter().del(lockKey(scopeKey));
}

export async function storeIdempotentResponse(
  scopeKey: string,
  response: StoredIdempotentResponse,
  ttlSeconds = DEFAULT_RESPONSE_TTL_SECONDS,
) {
  await getRuntimeStateAdapter().set(
    responseKey(scopeKey),
    JSON.stringify(response),
    ttlSeconds,
  );
}
