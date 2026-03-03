import { NextResponse } from "next/server";

import { getAppConfig } from "@/lib/config";
import { getObservabilitySnapshot } from "@/lib/observability";

export const runtime = "nodejs";

export async function GET() {
  const config = getAppConfig();
  const observability = getObservabilitySnapshot();

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    diagnostics: {
      geminiKeyPresent: config.geminiKeyPresent,
      demoSafeMode: config.demoSafeMode,
      historyMode: config.historyMode,
      rateLimitPerMin: config.rateLimitPerMin,
      rateLimitBurstPer10s: config.rateLimitBurstPer10s,
      maxInputChars: config.maxInputChars,
      appBaseUrlConfigured: Boolean(config.appBaseUrl),
      model: config.geminiModel,
      promptVersion: config.promptVersion,
      shareTokenSecretPresent: config.shareTokenSecretPresent,
      observability,
    },
  });
}
