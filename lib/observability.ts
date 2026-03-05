type MetricState = {
  processRequests: number;
  processSuccesses: number;
  processFailures: number;
  safetyFailures: number;
  geminiCacheHits: number;
  latencies: number[];
  integrationJobs: {
    queued: number;
    completed: number;
    failed: number;
    retried: number;
  };
};

const state: MetricState = {
  processRequests: 0,
  processSuccesses: 0,
  processFailures: 0,
  safetyFailures: 0,
  geminiCacheHits: 0,
  latencies: [],
  integrationJobs: {
    queued: 0,
    completed: 0,
    failed: 0,
    retried: 0,
  },
};

export function trackProcessRequest() {
  state.processRequests += 1;
}

export function trackProcessFailure() {
  state.processFailures += 1;
}

export function trackProcessSuccess() {
  state.processSuccesses += 1;
}

export function trackSafetyFailure() {
  state.safetyFailures += 1;
}

export function trackGeminiCacheHit() {
  state.geminiCacheHits += 1;
}

export function trackLatency(latencyMs: number) {
  state.latencies.push(Math.max(0, Math.round(latencyMs)));
  if (state.latencies.length > 512) {
    state.latencies.shift();
  }
}

export function trackIntegrationJob(
  status: "queued" | "completed" | "failed" | "retried",
) {
  state.integrationJobs[status] += 1;
}

function percentile(values: number[], p: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[index];
}

export function getObservabilitySnapshot() {
  const totalLatencyMs = state.latencies.reduce((total, item) => total + item, 0);
  const averageLatencyMs =
    state.processRequests > 0
      ? Math.round(totalLatencyMs / state.processRequests)
      : 0;
  const successRate =
    state.processRequests > 0
      ? state.processSuccesses / state.processRequests
      : 0;

  return {
    processRequests: state.processRequests,
    processSuccesses: state.processSuccesses,
    processFailures: state.processFailures,
    safetyFailures: state.safetyFailures,
    geminiCacheHits: state.geminiCacheHits,
    averageLatencyMs,
    p50LatencyMs: percentile(state.latencies, 50),
    p95LatencyMs: percentile(state.latencies, 95),
    successRate,
    integrationJobs: state.integrationJobs,
  };
}

export function logServerEvent(
  level: "info" | "warn" | "error",
  event: string,
  payload: Record<string, unknown>,
) {
  if (process.env.NODE_ENV === "production" && level === "info") {
    return;
  }

  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...payload,
  });

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export function resetObservabilityForTests() {
  state.processRequests = 0;
  state.processSuccesses = 0;
  state.processFailures = 0;
  state.safetyFailures = 0;
  state.geminiCacheHits = 0;
  state.latencies = [];
  state.integrationJobs = {
    queued: 0,
    completed: 0,
    failed: 0,
    retried: 0,
  };
}
