import { describe, expect, it } from "vitest";

import { checkRateLimit, resetRateLimiterForTests } from "@/lib/rateLimit";

describe("rate limiting", () => {
  it("enforces burst window", async () => {
    resetRateLimiterForTests();
    const key = "client-a";
    expect((await checkRateLimit(key, 20, 2)).allowed).toBe(true);
    expect((await checkRateLimit(key, 20, 2)).allowed).toBe(true);
    const blocked = await checkRateLimit(key, 20, 2);
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBe("burst_limit");
  });
});
