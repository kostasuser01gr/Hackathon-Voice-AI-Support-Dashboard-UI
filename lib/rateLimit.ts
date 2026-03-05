import { resetMemoryRuntimeStateForTests } from "@/lib/runtime-state/memory";
import { getRuntimeStateAdapter } from "@/lib/runtime-state";
import type { RateLimitResult } from "@/lib/runtime-state/types";

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

export async function checkRateLimit(
  clientKey: string,
  maxRequestsPerMinute: number,
  burstRequestsPer10s = 6,
): Promise<RateLimitResult> {
  return getRuntimeStateAdapter().checkRateLimit(
    clientKey,
    maxRequestsPerMinute,
    burstRequestsPer10s,
  );
}

export function resetRateLimiterForTests() {
  resetMemoryRuntimeStateForTests();
}
