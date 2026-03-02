type RateLimitState = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  reason?: "minute_limit" | "burst_limit";
};

const minuteState = new Map<string, RateLimitState>();
const burstState = new Map<string, RateLimitState>();

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export function checkRateLimit(
  clientKey: string,
  maxRequestsPerMinute: number,
  burstRequestsPer10s = 6,
): RateLimitResult {
  const now = Date.now();
  const minuteWindowMs = 60_000;
  const burstWindowMs = 10_000;

  const updateWindow = (
    stateMap: Map<string, RateLimitState>,
    windowMs: number,
    limit: number,
  ) => {
    const current = stateMap.get(clientKey);
    if (!current || now > current.resetAt) {
      stateMap.set(clientKey, { count: 1, resetAt: now + windowMs });
      return {
        allowed: true,
        retryAfterSeconds: Math.ceil(windowMs / 1000),
      };
    }

    if (current.count >= limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      };
    }

    current.count += 1;
    stateMap.set(clientKey, current);
    return {
      allowed: true,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  };

  const burstResult = updateWindow(burstState, burstWindowMs, burstRequestsPer10s);
  if (!burstResult.allowed) {
    return { ...burstResult, reason: "burst_limit" };
  }

  const minuteResult = updateWindow(
    minuteState,
    minuteWindowMs,
    maxRequestsPerMinute,
  );
  if (!minuteResult.allowed) {
    return { ...minuteResult, reason: "minute_limit" };
  }

  return minuteResult;
}

export function resetRateLimiterForTests() {
  minuteState.clear();
  burstState.clear();
}
