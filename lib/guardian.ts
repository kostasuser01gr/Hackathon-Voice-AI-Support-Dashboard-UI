import { getAppConfig } from "@/lib/config";
import { getObservabilitySnapshot, logServerEvent } from "@/lib/observability";
import { getSecuritySnapshot, purgeSecurityState } from "@/lib/securityShield";

type GuardianStatus = "healthy" | "degraded" | "critical";

type GuardianSnapshot = {
  enabled: boolean;
  status: GuardianStatus;
  healthScore: number;
  startedAt: string | null;
  lastEvaluatedAt: string | null;
  activeMitigations: string[];
  reasons: string[];
  security: {
    trackedClients: number;
    blockedClients: number;
    totalSignals: number;
  };
};

let timer: NodeJS.Timeout | null = null;
let startedAtMs: number | null = null;
let lastSnapshot: GuardianSnapshot = {
  enabled: false,
  status: "healthy",
  healthScore: 100,
  startedAt: null,
  lastEvaluatedAt: null,
  activeMitigations: [],
  reasons: [],
  security: {
    trackedClients: 0,
    blockedClients: 0,
    totalSignals: 0,
  },
};

function totalSignals(signalCounts: Record<string, number>) {
  return Object.values(signalCounts).reduce((total, count) => total + count, 0);
}

function evaluateGuardian(): GuardianSnapshot {
  const config = getAppConfig();
  const obs = getObservabilitySnapshot();
  const security = getSecuritySnapshot();

  const reasons: string[] = [];
  const mitigations: string[] = [];

  let score = 100;

  if (obs.successRate < 0.85 && obs.processRequests >= 5) {
    score -= 18;
    reasons.push("Process success rate below 85%.");
  }

  if (obs.p95LatencyMs > 2500) {
    score -= 14;
    reasons.push("P95 latency above 2500ms.");
  } else if (obs.p95LatencyMs > 1500) {
    score -= 8;
    reasons.push("P95 latency elevated above 1500ms.");
  }

  if (obs.safetyFailures >= 3) {
    score -= Math.min(18, obs.safetyFailures * 2);
    reasons.push("Safety check failures are elevated.");
  }

  if (security.blockedClients > 0) {
    score -= Math.min(20, security.blockedClients * 4);
    mitigations.push("Security shield temporary blocks active.");
  }

  if (security.signalCounts.rate_limited >= 10) {
    score -= 6;
    reasons.push("High rate-limit pressure detected.");
    mitigations.push("Traffic throttling engaged.");
  }

  if (security.signalCounts.bad_json >= 6) {
    score -= 5;
    reasons.push("Repeated malformed request payloads detected.");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let status: GuardianStatus = "healthy";
  if (score < 55) {
    status = "critical";
  } else if (score < 80) {
    status = "degraded";
  }

  if (status === "critical" && config.verifierPolicy !== "reject") {
    mitigations.push("Recommend VERIFIER_POLICY=reject until traffic stabilizes.");
  }

  const snapshot: GuardianSnapshot = {
    enabled: config.guardianEnabled,
    status,
    healthScore: score,
    startedAt: startedAtMs ? new Date(startedAtMs).toISOString() : null,
    lastEvaluatedAt: new Date().toISOString(),
    activeMitigations: mitigations,
    reasons,
    security: {
      trackedClients: security.trackedClients,
      blockedClients: security.blockedClients,
      totalSignals: totalSignals(security.signalCounts),
    },
  };

  if (snapshot.status !== lastSnapshot.status || snapshot.healthScore !== lastSnapshot.healthScore) {
    logServerEvent(snapshot.status === "critical" ? "warn" : "info", "guardian.snapshot", {
      status: snapshot.status,
      healthScore: snapshot.healthScore,
      reasons: snapshot.reasons,
      activeMitigations: snapshot.activeMitigations,
      blockedClients: snapshot.security.blockedClients,
    });
  }

  lastSnapshot = snapshot;
  return snapshot;
}

export function startRuntimeGuardian() {
  const config = getAppConfig();
  if (!config.guardianEnabled) {
    lastSnapshot = {
      ...lastSnapshot,
      enabled: false,
      status: "healthy",
      lastEvaluatedAt: new Date().toISOString(),
    };
    return;
  }

  if (process.env.NODE_ENV === "test") {
    evaluateGuardian();
    return;
  }

  if (timer) {
    return;
  }

  startedAtMs = Date.now();
  evaluateGuardian();

  timer = setInterval(() => {
    purgeSecurityState();
    evaluateGuardian();
  }, config.guardianIntervalMs);
  timer.unref?.();
}

export function getGuardianSnapshot() {
  if (!lastSnapshot.lastEvaluatedAt) {
    return evaluateGuardian();
  }
  return lastSnapshot;
}

export function evaluateGuardianNow() {
  return evaluateGuardian();
}

export function stopGuardianForTests() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  startedAtMs = null;
  lastSnapshot = {
    enabled: false,
    status: "healthy",
    healthScore: 100,
    startedAt: null,
    lastEvaluatedAt: null,
    activeMitigations: [],
    reasons: [],
    security: {
      trackedClients: 0,
      blockedClients: 0,
      totalSignals: 0,
    },
  };
}
