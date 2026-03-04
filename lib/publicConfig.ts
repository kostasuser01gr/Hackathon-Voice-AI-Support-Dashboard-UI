import "server-only";

export type PublicConfig = {
  demoSafeMode: boolean;
  historyMode: "local" | "db";
  maxInputChars: number;
  rateLimitPerMin: number;
  geminiConfigured: boolean;
};

function parseNumber(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

export function getPublicConfig(): PublicConfig {
  return {
    demoSafeMode: process.env.DEMO_SAFE_MODE === "true",
    historyMode: process.env.HISTORY_MODE === "db" ? "db" : "local",
    maxInputChars: parseNumber(process.env.MAX_INPUT_CHARS, 2000),
    rateLimitPerMin: parseNumber(process.env.RATE_LIMIT_PER_MIN, 20),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  };
}
