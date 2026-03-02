export type HistoryMode = "db" | "local";

export type AppConfig = {
  appBaseUrl?: string;
  historyMode: HistoryMode;
  rateLimitPerMin: number;
  maxInputChars: number;
  geminiKeyPresent: boolean;
  geminiModel: string;
};

const DEFAULT_RATE_LIMIT_PER_MIN = 20;
const DEFAULT_MAX_INPUT_CHARS = 2000;
export const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

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
    maxInputChars: parsePositiveInt(
      process.env.MAX_INPUT_CHARS,
      DEFAULT_MAX_INPUT_CHARS,
      200,
      10000,
    ),
    geminiKeyPresent: Boolean(process.env.GEMINI_API_KEY),
    geminiModel: DEFAULT_GEMINI_MODEL,
  };
}
