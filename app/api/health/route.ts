import { NextResponse } from "next/server";

import { getAppConfig } from "@/lib/config";

export const runtime = "nodejs";

export async function GET() {
  const config = getAppConfig();

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    diagnostics: {
      geminiKeyPresent: config.geminiKeyPresent,
      historyMode: config.historyMode,
      rateLimitPerMin: config.rateLimitPerMin,
      maxInputChars: config.maxInputChars,
      appBaseUrlConfigured: Boolean(config.appBaseUrl),
      model: config.geminiModel,
    },
  });
}
