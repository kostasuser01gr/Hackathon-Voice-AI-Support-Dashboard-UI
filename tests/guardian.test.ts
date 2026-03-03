import { afterEach, describe, expect, it, vi } from "vitest";

import { evaluateGuardianNow, getGuardianSnapshot, stopGuardianForTests } from "@/lib/guardian";
import {
  resetObservabilityForTests,
  trackLatency,
  trackProcessFailure,
  trackProcessRequest,
  trackSafetyFailure,
} from "@/lib/observability";
import { resetSecurityShieldForTests, trackSecuritySignal } from "@/lib/securityShield";

describe("runtime guardian", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    stopGuardianForTests();
    resetObservabilityForTests();
    resetSecurityShieldForTests();
  });

  it("returns healthy snapshot by default", () => {
    const snapshot = evaluateGuardianNow();
    expect(snapshot.status).toBe("healthy");
    expect(snapshot.healthScore).toBeGreaterThanOrEqual(80);
  });

  it("degrades when failures, latency, and attack pressure increase", () => {
    vi.stubEnv("GUARDIAN_ENABLED", "true");

    for (let index = 0; index < 10; index += 1) {
      trackProcessRequest();
      if (index < 6) {
        trackProcessFailure();
      }
      trackLatency(3100);
    }

    trackSafetyFailure();
    trackSafetyFailure();
    trackSafetyFailure();

    const client = "203.0.113.20:attacker";
    trackSecuritySignal(client, "rate_limited");
    trackSecuritySignal(client, "bad_json");
    trackSecuritySignal(client, "rate_limited");

    const snapshot = evaluateGuardianNow();

    expect(snapshot.status === "degraded" || snapshot.status === "critical").toBe(true);
    expect(snapshot.healthScore).toBeLessThan(80);
    expect(snapshot.security.totalSignals).toBeGreaterThan(0);
    expect(getGuardianSnapshot().lastEvaluatedAt).not.toBeNull();
  });
});
