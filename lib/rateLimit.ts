type RateLimitState = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const rateState = new Map<string, RateLimitState>();

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
  clientIp: string,
  maxRequestsPerMinute: number,
): RateLimitResult {
  const now = Date.now();
  const windowMs = 60_000;
  const entry = rateState.get(clientIp);

  if (!entry || now > entry.resetAt) {
    rateState.set(clientIp, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      allowed: true,
      retryAfterSeconds: 60,
    };
  }

  if (entry.count >= maxRequestsPerMinute) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count += 1;
  rateState.set(clientIp, entry);

  return {
    allowed: true,
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  };
}

export function resetRateLimiterForTests() {
  rateState.clear();
}
