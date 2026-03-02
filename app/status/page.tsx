import Link from "next/link";

import { getAppConfig } from "@/lib/config";
import { getObservabilitySnapshot } from "@/lib/observability";

export default function StatusPage() {
  const config = getAppConfig();
  const metrics = getObservabilitySnapshot();

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Service Status</h1>
        <p className="mt-2 text-sm text-slate-600">
          Public diagnostics page for deployment verification.
        </p>
        <div className="mt-4 space-y-1 text-sm text-slate-800">
          <p>Environment: {process.env.NODE_ENV}</p>
          <p>Gemini key present: {config.geminiKeyPresent ? "yes" : "no"}</p>
          <p>History mode: {config.historyMode}</p>
          <p>Rate limit: {config.rateLimitPerMin}/min</p>
          <p>Burst limit: {config.rateLimitBurstPer10s}/10s</p>
          <p>Prompt version: {config.promptVersion}</p>
          <p>Average latency: {metrics.averageLatencyMs} ms</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/api/health"
            className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-900"
          >
            Open /api/health
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-700"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
