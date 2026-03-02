"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import {
  getLocalHistoryServerSnapshot,
  getLocalHistorySnapshot,
  subscribeLocalHistory,
} from "@/lib/history";
import { PRESETS } from "@/lib/presets";
import { HealthResponseSchema, type HealthResponse } from "@/lib/schema";
import { toSessionSummary, type SessionSummary } from "@/lib/session";

type DbSessionSummary = SessionSummary;

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString();
}

function presetLabel(id: string) {
  return PRESETS.find((preset) => preset.id === id)?.label ?? id;
}

export default function HistoryPage() {
  const localSessions = useSyncExternalStore(
    subscribeLocalHistory,
    getLocalHistorySnapshot,
    getLocalHistoryServerSnapshot,
  );

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<"all" | "voice" | "text">("all");
  const [dbSessions, setDbSessions] = useState<DbSessionSummary[]>([]);
  const [loadingDb, setLoadingDb] = useState(false);
  const [dbError, setDbError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadHealth = async () => {
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        const payload = (await response.json()) as unknown;
        const parsed = HealthResponseSchema.safeParse(payload);

        if (!cancelled && parsed.success) {
          setHealth(parsed.data);
        }
      } catch {
        if (!cancelled) {
          setHealth(null);
        }
      }
    };

    loadHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (health?.diagnostics.historyMode !== "db") {
      return;
    }

    let cancelled = false;

    const loadDbSessions = async () => {
      setLoadingDb(true);
      setDbError("");

      try {
        const query = new URLSearchParams();
        if (search.trim()) {
          query.set("search", search.trim());
        }
        query.set("mode", modeFilter);

        const response = await fetch(`/api/history?${query.toString()}`, {
          cache: "no-store",
        });

        const payload = (await response.json()) as unknown;
        if (!response.ok) {
          throw new Error("Could not fetch DB history.");
        }

        const sessions = (payload as { sessions?: DbSessionSummary[] }).sessions;
        if (!cancelled) {
          setDbSessions(Array.isArray(sessions) ? sessions : []);
        }
      } catch {
        if (!cancelled) {
          setDbError("Could not fetch DB history sessions.");
        }
      } finally {
        if (!cancelled) {
          setLoadingDb(false);
        }
      }
    };

    loadDbSessions();

    return () => {
      cancelled = true;
    };
  }, [health?.diagnostics.historyMode, modeFilter, search]);

  const localRows = useMemo(() => {
    const all = localSessions.map((session) => toSessionSummary(session));

    return all.filter((session) => {
      const matchesMode = modeFilter === "all" || session.inputMode === modeFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        session.summarySnippet.toLowerCase().includes(q) ||
        session.id.toLowerCase().includes(q);

      return matchesMode && matchesSearch;
    });
  }, [localSessions, modeFilter, search]);

  const isDbMode = health?.diagnostics.historyMode === "db";
  const rows = isDbMode ? dbSessions : localRows;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#d9f5ff_0%,#f5f9ff_35%,#f7f6ff_60%,#ffffff_100%)] px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold">History</h1>
              <p className="text-sm text-slate-600">
                {isDbMode
                  ? "Database-backed sessions"
                  : "Local browser sessions (last 25)"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Dashboard
              </Link>
              <Link
                href="/settings"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Settings
              </Link>
            </div>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-[1fr_180px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search summary or ID"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-400"
            />
            <select
              value={modeFilter}
              onChange={(event) =>
                setModeFilter(event.target.value as "all" | "voice" | "text")
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-400"
            >
              <option value="all">All modes</option>
              <option value="voice">Voice</option>
              <option value="text">Text</option>
            </select>
          </div>
        </header>

        {(dbError || loadingDb) && isDbMode && (
          <div className="mb-4 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700">
            {loadingDb ? "Loading DB history..." : dbError}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-white/60 bg-white/85 shadow-[0_8px_32px_rgba(15,23,42,0.08)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Timestamp</th>
                <th className="px-4 py-3 font-semibold">Mode</th>
                <th className="px-4 py-3 font-semibold">Preset</th>
                <th className="px-4 py-3 font-semibold">Summary</th>
                <th className="px-4 py-3 font-semibold">Action Count</th>
                <th className="px-4 py-3 font-semibold">Open</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">{formatTimestamp(row.createdAt)}</td>
                    <td className="px-4 py-3 uppercase">{row.inputMode}</td>
                    <td className="px-4 py-3">{presetLabel(row.presetId)}</td>
                    <td className="max-w-sm truncate px-4 py-3">{row.summarySnippet}</td>
                    <td className="px-4 py-3">{row.actionCount}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/history/${row.id}`}
                        className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No sessions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
