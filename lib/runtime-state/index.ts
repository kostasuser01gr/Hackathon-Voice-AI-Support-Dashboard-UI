import { createMemoryRuntimeStateAdapter } from "@/lib/runtime-state/memory";
import { createRedisRuntimeStateAdapter } from "@/lib/runtime-state/redis";
import type { RuntimeStateAdapter } from "@/lib/runtime-state/types";

let adapter: RuntimeStateAdapter | null = null;

function resolveMode() {
  const configured = process.env.RUNTIME_STATE_MODE?.trim().toLowerCase();
  if (configured === "redis" || configured === "memory") {
    return configured;
  }

  return process.env.REDIS_URL ? "redis" : "memory";
}

function buildAdapter(): RuntimeStateAdapter {
  const mode = resolveMode();
  if (mode === "redis") {
    const redisUrl = process.env.REDIS_URL?.trim();
    if (!redisUrl) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "REDIS_URL is required when RUNTIME_STATE_MODE=redis in production.",
        );
      }
      return createMemoryRuntimeStateAdapter();
    }
    return createRedisRuntimeStateAdapter(redisUrl);
  }

  return createMemoryRuntimeStateAdapter();
}

export function getRuntimeStateAdapter() {
  if (adapter) {
    return adapter;
  }

  adapter = buildAdapter();
  return adapter;
}

export function resetRuntimeStateAdapterForTests() {
  adapter = null;
}
