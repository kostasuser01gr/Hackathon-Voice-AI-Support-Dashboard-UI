import type { RateLimitResult, RuntimeStateAdapter } from "@/lib/runtime-state/types";

type WindowState = {
  count: number;
  resetAt: number;
};

type ValueState = {
  value: string;
  expiresAt: number | null;
};

const minuteState = new Map<string, WindowState>();
const burstState = new Map<string, WindowState>();
const values = new Map<string, ValueState>();

function nowMs() {
  return Date.now();
}

function pruneExpired(key: string) {
  const entry = values.get(key);
  if (!entry) {
    return;
  }
  if (entry.expiresAt !== null && entry.expiresAt <= nowMs()) {
    values.delete(key);
  }
}

function updateWindow(
  stateMap: Map<string, WindowState>,
  key: string,
  windowMs: number,
  limit: number,
): RateLimitResult {
  const now = nowMs();
  const current = stateMap.get(key);
  if (!current || now > current.resetAt) {
    stateMap.set(key, { count: 1, resetAt: now + windowMs });
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
  stateMap.set(key, current);
  return {
    allowed: true,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

export function createMemoryRuntimeStateAdapter(): RuntimeStateAdapter {
  return {
    kind: "memory",
    async checkRateLimit(clientKey, maxRequestsPerMinute, burstRequestsPer10s) {
      const burst = updateWindow(burstState, clientKey, 10_000, burstRequestsPer10s);
      if (!burst.allowed) {
        return { ...burst, reason: "burst_limit" };
      }

      const minute = updateWindow(minuteState, clientKey, 60_000, maxRequestsPerMinute);
      if (!minute.allowed) {
        return { ...minute, reason: "minute_limit" };
      }

      return minute;
    },
    async get(key) {
      pruneExpired(key);
      return values.get(key)?.value ?? null;
    },
    async set(key, value, ttlSeconds) {
      values.set(key, {
        value,
        expiresAt:
          typeof ttlSeconds === "number" && Number.isFinite(ttlSeconds) && ttlSeconds > 0
            ? nowMs() + ttlSeconds * 1000
            : null,
      });
    },
    async setIfAbsent(key, value, ttlSeconds) {
      pruneExpired(key);
      if (values.has(key)) {
        return false;
      }

      values.set(key, {
        value,
        expiresAt: nowMs() + Math.max(1, Math.round(ttlSeconds)) * 1000,
      });
      return true;
    },
    async del(key) {
      values.delete(key);
    },
    async incrBy(key, delta, ttlSeconds) {
      pruneExpired(key);
      const currentRaw = values.get(key)?.value ?? "0";
      const current = Number.parseInt(currentRaw, 10);
      const next = (Number.isFinite(current) ? current : 0) + delta;
      values.set(key, {
        value: String(next),
        expiresAt:
          typeof ttlSeconds === "number" && Number.isFinite(ttlSeconds) && ttlSeconds > 0
            ? nowMs() + ttlSeconds * 1000
            : values.get(key)?.expiresAt ?? null,
      });
      return next;
    },
  };
}

export function resetMemoryRuntimeStateForTests() {
  minuteState.clear();
  burstState.clear();
  values.clear();
}
