import Redis from "ioredis";

import type { RateLimitResult, RuntimeStateAdapter } from "@/lib/runtime-state/types";

function sanitizeKey(value: string) {
  return value.replace(/[^a-zA-Z0-9:_-]/g, "_");
}

export function createRedisRuntimeStateAdapter(redisUrl: string): RuntimeStateAdapter {
  const redis = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: true,
  });

  async function checkWindow(
    key: string,
    windowMs: number,
    limit: number,
  ): Promise<RateLimitResult> {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.pexpire(key, windowMs);
    }
    const ttlMs = await redis.pttl(key);
    const retryAfterSeconds = Math.max(1, Math.ceil(Math.max(ttlMs, 1000) / 1000));

    return {
      allowed: count <= limit,
      retryAfterSeconds,
    };
  }

  return {
    kind: "redis",
    async checkRateLimit(clientKey, maxRequestsPerMinute, burstRequestsPer10s) {
      const normalized = sanitizeKey(clientKey);
      const burst = await checkWindow(`rl:burst:${normalized}`, 10_000, burstRequestsPer10s);
      if (!burst.allowed) {
        return { ...burst, reason: "burst_limit" };
      }

      const minute = await checkWindow(`rl:minute:${normalized}`, 60_000, maxRequestsPerMinute);
      if (!minute.allowed) {
        return { ...minute, reason: "minute_limit" };
      }

      return minute;
    },
    async get(key) {
      return redis.get(key);
    },
    async set(key, value, ttlSeconds) {
      if (ttlSeconds && ttlSeconds > 0) {
        await redis.set(key, value, "EX", Math.max(1, Math.round(ttlSeconds)));
        return;
      }
      await redis.set(key, value);
    },
    async setIfAbsent(key, value, ttlSeconds) {
      const result = await redis.set(
        key,
        value,
        "EX",
        Math.max(1, Math.round(ttlSeconds)),
        "NX",
      );
      return result === "OK";
    },
    async del(key) {
      await redis.del(key);
    },
    async incrBy(key, delta, ttlSeconds) {
      const value = await redis.incrby(key, delta);
      if (value === delta && ttlSeconds && ttlSeconds > 0) {
        await redis.expire(key, Math.max(1, Math.round(ttlSeconds)));
      }
      return value;
    },
  };
}
