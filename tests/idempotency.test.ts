import { describe, expect, it } from "vitest";

import {
  acquireIdempotencyLock,
  buildIdempotencyScopeKey,
  loadIdempotentResponse,
  releaseIdempotencyLock,
  storeIdempotentResponse,
} from "@/lib/idempotency";
import { resetMemoryRuntimeStateForTests } from "@/lib/runtime-state/memory";

describe("idempotency store", () => {
  it("stores and replays responses by scope key", async () => {
    resetMemoryRuntimeStateForTests();
    const scope = buildIdempotencyScopeKey({
      route: "api.process",
      workspaceId: "w1",
      userId: "u1",
      key: "abc-123",
    });

    await storeIdempotentResponse(scope, {
      status: 202,
      body: { ok: true, requestId: "r1" },
      storedAt: new Date().toISOString(),
    });

    const loaded = await loadIdempotentResponse(scope);
    expect(loaded).not.toBeNull();
    expect(loaded?.status).toBe(202);
    expect(loaded?.body).toEqual({ ok: true, requestId: "r1" });
  });

  it("prevents duplicate in-flight requests using lock", async () => {
    resetMemoryRuntimeStateForTests();
    const scope = buildIdempotencyScopeKey({
      route: "api.integrations.execute",
      workspaceId: "w1",
      userId: "u1",
      key: "dup-key",
    });

    expect(await acquireIdempotencyLock(scope)).toBe(true);
    expect(await acquireIdempotencyLock(scope)).toBe(false);
    await releaseIdempotencyLock(scope);
    expect(await acquireIdempotencyLock(scope)).toBe(true);
  });
});
