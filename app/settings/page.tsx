"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { PRESETS, type PresetId } from "@/lib/presets";
import { HealthResponseSchema, type HealthResponse } from "@/lib/schema";
import {
  getUserSettingsServerSnapshot,
  getUserSettingsSnapshot,
  patchUserSettings,
  subscribeUserSettings,
} from "@/lib/userSettings";

export default function SettingsPage() {
  const settings = useSyncExternalStore(
    subscribeUserSettings,
    getUserSettingsSnapshot,
    getUserSettingsServerSnapshot,
  );
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadHealth = async () => {
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        const payload = (await response.json()) as unknown;
        const parsed = HealthResponseSchema.safeParse(payload);

        if (!cancelled) {
          if (parsed.success) {
            setHealth(parsed.data);
            setHealthError("");
          } else {
            setHealthError("Diagnostics unavailable.");
          }
        }
      } catch {
        if (!cancelled) {
          setHealthError("Failed to load diagnostics.");
        }
      }
    };

    loadHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#d9f5ff_0%,#f5f9ff_35%,#f7f6ff_60%,#ffffff_100%)] px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold">Settings</h1>
              <p className="text-sm text-slate-600">
                Configure local behavior and diagnostics for demo stability.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Dashboard
              </Link>
              <Link
                href="/history"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                History
              </Link>
            </div>
          </div>
        </header>

        <section className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_8px_32px_rgba(15,23,42,0.08)]">
          <h2 className="mb-4 text-xl font-semibold">Preferences</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="mb-1 block text-sm font-semibold">Store History</span>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.storeHistory}
                  onChange={(event) =>
                    patchUserSettings({ storeHistory: event.target.checked })
                  }
                />
                <span className="text-sm text-slate-700">Keep session history</span>
              </div>
            </label>

            <label className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="mb-1 block text-sm font-semibold">Default Preset</span>
              <select
                value={settings.defaultPreset}
                onChange={(event) =>
                  patchUserSettings({ defaultPreset: event.target.value as PresetId })
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="mb-1 block text-sm font-semibold">Language (placeholder)</span>
              <input
                value={settings.language}
                onChange={(event) => patchUserSettings({ language: event.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </label>

            <label className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="mb-1 block text-sm font-semibold">Tone</span>
              <select
                value={settings.tone}
                onChange={(event) =>
                  patchUserSettings({ tone: event.target.value as "neutral" | "pro" })
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="neutral">neutral</option>
                <option value="pro">pro</option>
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_8px_32px_rgba(15,23,42,0.08)]">
          <h2 className="mb-3 text-xl font-semibold">Diagnostics</h2>
          {healthError && (
            <p className="mb-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {healthError}
            </p>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <p>
                Gemini key present: {health?.diagnostics.geminiKeyPresent ? "yes" : "no"}
              </p>
              <p>History mode: {health?.diagnostics.historyMode ?? "unknown"}</p>
              <p>Rate limit/min: {health?.diagnostics.rateLimitPerMin ?? "unknown"}</p>
              <p>Max input chars: {health?.diagnostics.maxInputChars ?? "unknown"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
              <p>Last latency: {settings.lastLatencyMs ?? "-"} ms</p>
              <p>Last validation: {settings.lastValidation ?? "-"}</p>
              <p>Model: {health?.diagnostics.model ?? "unknown"}</p>
              <p>
                APP_BASE_URL configured: {health?.diagnostics.appBaseUrlConfigured ? "yes" : "no"}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
