export type HistoryMode = "db" | "local";
export type VerifierPolicy = "reject" | "repair" | "warn";
export type IntegrationsMode = "mock" | "live";
export type RuntimeStateMode = "memory" | "redis";

export type AppConfig = {
  appBaseUrl?: string;
  historyMode: HistoryMode;
  rateLimitPerMin: number;
  rateLimitBurstPer10s: number;
  maxInputChars: number;
  geminiKeyPresent: boolean;
  demoSafeMode: boolean;
  geminiModel: string;
  promptVersion: string;
  shareTokenSecretPresent: boolean;
  sessionSigningSecretPresent: boolean;
  featureWave1: boolean;
  verifierPolicy: VerifierPolicy;
  integrationsMode: IntegrationsMode;
  runtimeStateMode: RuntimeStateMode;
  redisConfigured: boolean;
  guardianEnabled: boolean;
  guardianIntervalMs: number;
  securityBlockMinutes: number;
  securityRiskThreshold: number;
  featureV2Apis: boolean;
  mutationIdempotencyRequired: boolean;
  requireSignedSessionInProd: boolean;
  allowHeaderSessionFallbackInProd: boolean;
  shareTokenTtlMs: number;
  shareTokenRequirePassword: boolean;
  secondaryGeminiModel?: string;
  geminiTimeoutMs: number;
  geminiCircuitBreakerFailureThreshold: number;
  geminiCircuitBreakerCooldownMs: number;
  cloudTasksQueue?: string;
  cloudTasksLocation?: string;
  canaryWorkspaceAllowlist: string[];
};

const DEFAULT_RATE_LIMIT_PER_MIN = 20;
const DEFAULT_RATE_LIMIT_BURST_PER_10S = 6;
const DEFAULT_MAX_INPUT_CHARS = 2000;
export const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
const DEFAULT_PROMPT_VERSION = "v1";
const DEFAULT_GUARDIAN_INTERVAL_MS = 10_000;
const DEFAULT_SECURITY_BLOCK_MINUTES = 5;
const DEFAULT_SECURITY_RISK_THRESHOLD = 100;
const DEFAULT_SHARE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_GEMINI_TIMEOUT_MS = 10_000;
const DEFAULT_GEMINI_BREAKER_FAILURE_THRESHOLD = 5;
const DEFAULT_GEMINI_BREAKER_COOLDOWN_MS = 30_000;

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function parseHistoryMode(value: string | undefined): HistoryMode {
  return value === "db" ? "db" : "local";
}

function parseBoolean(value: string | undefined, fallback = false) {
  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function parseVerifierPolicy(value: string | undefined): VerifierPolicy {
  if (value === "reject" || value === "repair" || value === "warn") {
    return value;
  }

  return "warn";
}

function parseIntegrationsMode(value: string | undefined): IntegrationsMode {
  return value === "live" ? "live" : "mock";
}

function parseRuntimeStateMode(value: string | undefined): RuntimeStateMode {
  return value === "redis" ? "redis" : "memory";
}

function parseCsv(value: string | undefined) {
  if (!value?.trim()) {
    return [];
  }
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function getAppConfig(): AppConfig {
  return {
    appBaseUrl: process.env.APP_BASE_URL,
    historyMode: parseHistoryMode(process.env.HISTORY_MODE),
    rateLimitPerMin: parsePositiveInt(
      process.env.RATE_LIMIT_PER_MIN,
      DEFAULT_RATE_LIMIT_PER_MIN,
      1,
      1000,
    ),
    rateLimitBurstPer10s: parsePositiveInt(
      process.env.RATE_LIMIT_BURST_PER_10S,
      DEFAULT_RATE_LIMIT_BURST_PER_10S,
      1,
      500,
    ),
    maxInputChars: parsePositiveInt(
      process.env.MAX_INPUT_CHARS,
      DEFAULT_MAX_INPUT_CHARS,
      200,
      10000,
    ),
    geminiKeyPresent: Boolean(process.env.GEMINI_API_KEY),
    demoSafeMode: parseBoolean(process.env.DEMO_SAFE_MODE, false),
    geminiModel: DEFAULT_GEMINI_MODEL,
    promptVersion: process.env.PROMPT_VERSION?.trim() || DEFAULT_PROMPT_VERSION,
    shareTokenSecretPresent: Boolean(process.env.SHARE_TOKEN_SECRET),
    sessionSigningSecretPresent: Boolean(process.env.SESSION_SIGNING_SECRET),
    featureWave1: parseBoolean(process.env.FEATURE_WAVE1, true),
    verifierPolicy: parseVerifierPolicy(process.env.VERIFIER_POLICY),
    integrationsMode: parseIntegrationsMode(process.env.INTEGRATIONS_MODE),
    runtimeStateMode: parseRuntimeStateMode(process.env.RUNTIME_STATE_MODE),
    redisConfigured: Boolean(process.env.REDIS_URL),
    guardianEnabled: parseBoolean(process.env.GUARDIAN_ENABLED, true),
    guardianIntervalMs: parsePositiveInt(
      process.env.GUARDIAN_INTERVAL_MS,
      DEFAULT_GUARDIAN_INTERVAL_MS,
      1000,
      120_000,
    ),
    securityBlockMinutes: parsePositiveInt(
      process.env.SECURITY_BLOCK_MINUTES,
      DEFAULT_SECURITY_BLOCK_MINUTES,
      1,
      120,
    ),
    securityRiskThreshold: parsePositiveInt(
      process.env.SECURITY_RISK_THRESHOLD,
      DEFAULT_SECURITY_RISK_THRESHOLD,
      50,
      400,
    ),
    featureV2Apis: parseBoolean(process.env.FEATURE_V2_APIS, true),
    mutationIdempotencyRequired: parseBoolean(
      process.env.MUTATION_IDEMPOTENCY_REQUIRED,
      false,
    ),
    requireSignedSessionInProd: parseBoolean(
      process.env.REQUIRE_SIGNED_SESSION_IN_PROD,
      true,
    ),
    allowHeaderSessionFallbackInProd: parseBoolean(
      process.env.ALLOW_HEADER_SESSION_FALLBACK_IN_PROD,
      false,
    ),
    shareTokenTtlMs: parsePositiveInt(
      process.env.SHARE_TOKEN_TTL_MS,
      DEFAULT_SHARE_TOKEN_TTL_MS,
      60_000,
      1000 * 60 * 60 * 24 * 365,
    ),
    shareTokenRequirePassword: parseBoolean(process.env.SHARE_TOKEN_REQUIRE_PASSWORD, false),
    secondaryGeminiModel: process.env.SECONDARY_GEMINI_MODEL?.trim() || undefined,
    geminiTimeoutMs: parsePositiveInt(
      process.env.GEMINI_TIMEOUT_MS,
      DEFAULT_GEMINI_TIMEOUT_MS,
      1000,
      60_000,
    ),
    geminiCircuitBreakerFailureThreshold: parsePositiveInt(
      process.env.GEMINI_BREAKER_FAILURE_THRESHOLD,
      DEFAULT_GEMINI_BREAKER_FAILURE_THRESHOLD,
      1,
      50,
    ),
    geminiCircuitBreakerCooldownMs: parsePositiveInt(
      process.env.GEMINI_BREAKER_COOLDOWN_MS,
      DEFAULT_GEMINI_BREAKER_COOLDOWN_MS,
      1_000,
      300_000,
    ),
    cloudTasksQueue: process.env.CLOUD_TASKS_QUEUE?.trim() || undefined,
    cloudTasksLocation: process.env.CLOUD_TASKS_LOCATION?.trim() || undefined,
    canaryWorkspaceAllowlist: parseCsv(process.env.CANARY_WORKSPACE_ALLOWLIST),
  };
}
