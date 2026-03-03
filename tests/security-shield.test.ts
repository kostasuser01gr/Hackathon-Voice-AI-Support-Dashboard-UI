import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getSecuritySnapshot,
  isClientBlocked,
  resetSecurityShieldForTests,
  trackSecuritySignal,
} from "@/lib/securityShield";

describe("security shield", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetSecurityShieldForTests();
  });

  it("blocks abusive client fingerprints after threshold", () => {
    vi.stubEnv("SECURITY_RISK_THRESHOLD", "50");
    vi.stubEnv("SECURITY_BLOCK_MINUTES", "2");

    const key = "198.51.100.4:demo-user";
    trackSecuritySignal(key, "rate_limited");
    trackSecuritySignal(key, "rate_limited");
    const third = trackSecuritySignal(key, "bad_json");

    expect(third.blocked).toBe(true);

    const blocked = isClientBlocked(key);
    expect(blocked.blocked).toBe(true);
    expect(blocked.score).toBeGreaterThanOrEqual(50);
  });

  it("tracks signal counters and snapshot totals", () => {
    const key = "198.51.100.8:agent";
    trackSecuritySignal(key, "bad_json");
    trackSecuritySignal(key, "payload_invalid");
    trackSecuritySignal(key, "success");

    const snapshot = getSecuritySnapshot();
    expect(snapshot.trackedClients).toBe(1);
    expect(snapshot.signalCounts.bad_json).toBe(1);
    expect(snapshot.signalCounts.payload_invalid).toBe(1);
    expect(snapshot.signalCounts.success).toBe(1);
    expect(snapshot.recentEvents.length).toBeGreaterThanOrEqual(3);
  });
});
