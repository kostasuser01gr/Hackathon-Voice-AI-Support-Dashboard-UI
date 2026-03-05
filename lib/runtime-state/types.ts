export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  reason?: "minute_limit" | "burst_limit";
};

export type RuntimeStateAdapterKind = "memory" | "redis";

export type RuntimeStateAdapter = {
  kind: RuntimeStateAdapterKind;
  checkRateLimit: (
    clientKey: string,
    maxRequestsPerMinute: number,
    burstRequestsPer10s: number,
  ) => Promise<RateLimitResult>;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttlSeconds?: number) => Promise<void>;
  setIfAbsent: (key: string, value: string, ttlSeconds: number) => Promise<boolean>;
  del: (key: string) => Promise<void>;
  incrBy: (key: string, delta: number, ttlSeconds?: number) => Promise<number>;
};
