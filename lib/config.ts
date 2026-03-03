export type HistoryMode = "db" | "local";
export type VerifierPolicy = "reject" | "repair" | "warn";
export type IntegrationsMode = "mock" | "live";

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
  guardianEnabled: boolean;
  guardianIntervalMs: number;
  securityBlockMinutes: number;
  securityRiskThreshold: number;
};

const DEFAULT_RATE_LIMIT_PER_MIN = 20;
const DEFAULT_RATE_LIMIT_BURST_PER_10S = 6;
const DEFAULT_MAX_INPUT_CHARS = 2000;
export const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
const DEFAULT_PROMPT_VERSION = "v1";
const DEFAULT_GUARDIAN_INTERVAL_MS = 10_000;
const DEFAULT_SECURITY_BLOCK_MINUTES = 5;
const DEFAULT_SECURITY_RISK_THRESHOLD = 100;

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
  };
}
