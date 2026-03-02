type MetricState = {
  processRequests: number;
  processFailures: number;
  safetyFailures: number;
  totalLatencyMs: number;
};

const state: MetricState = {
  processRequests: 0,
  processFailures: 0,
  safetyFailures: 0,
  totalLatencyMs: 0,
};

export function trackProcessRequest() {
  state.processRequests += 1;
}

export function trackProcessFailure() {
  state.processFailures += 1;
}

export function trackSafetyFailure() {
  state.safetyFailures += 1;
}

export function trackLatency(latencyMs: number) {
  state.totalLatencyMs += Math.max(0, Math.round(latencyMs));
}

export function getObservabilitySnapshot() {
  const averageLatencyMs =
    state.processRequests > 0
      ? Math.round(state.totalLatencyMs / state.processRequests)
      : 0;

  return {
    processRequests: state.processRequests,
    processFailures: state.processFailures,
    safetyFailures: state.safetyFailures,
    averageLatencyMs,
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
  state.processFailures = 0;
  state.safetyFailures = 0;
  state.totalLatencyMs = 0;
}
