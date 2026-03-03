"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import {
  getLocalHistoryServerSnapshot,
  getLocalHistorySnapshot,
  subscribeLocalHistory,
} from "@/lib/history";
import type { PresetId } from "@/lib/presets";
import { HealthResponseSchema, type HealthResponse } from "@/lib/schema";
import { toSessionSummary } from "@/lib/session";
import { defaultSessionReview } from "@/lib/session-meta";

type ReviewStatus = "pending" | "approved" | "executed";

type ActionBoardRow = {
  id: string;
  createdAt: string;
  workspaceId?: string;
  inputMode: "voice" | "text";
  summarySnippet: string;
  actionCount: number;
  presetId: PresetId;
  review: {
    emailApproved: boolean;
    tasksApproved: boolean;
    executed: boolean;
  };
};

function toReviewStatus(review: ActionBoardRow["review"]): ReviewStatus {
  if (review.executed) {
    return "executed";
  }
  if (review.emailApproved && review.tasksApproved) {
    return "approved";
  }
  return "pending";
}

function formatTs(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function ActionsPage() {
  const localSessions = useSyncExternalStore(
    subscribeLocalHistory,
    getLocalHistorySnapshot,
    getLocalHistoryServerSnapshot,
  );
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "all">("pending");
  const [rows, setRows] = useState<ActionBoardRow[]>([]);
  const [error, setError] = useState("");

  const historyMode = health?.diagnostics.historyMode ?? "local";

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
    if (historyMode !== "db") {
      return;
    }

    let cancelled = false;
    const loadRows = async () => {
      setError("");
      try {
        const response = await fetch("/api/history?mode=all", { cache: "no-store" });
        const payload = (await response.json()) as {
          sessions?: Array<{
            id: string;
            createdAt: string;
            workspaceId?: string;
            summarySnippet: string;
            actionCount: number;
            inputMode: "voice" | "text";
            presetId: string;
            review?: {
              emailApproved: boolean;
              tasksApproved: boolean;
              executed?: boolean;
            };
          }>;
          error?: { message?: string };
        };

        if (!response.ok || !Array.isArray(payload.sessions)) {
          throw new Error(payload.error?.message ?? "Failed to load actions.");
        }

        if (!cancelled) {
          setRows(
            payload.sessions.map((session) => ({
              id: session.id,
              createdAt: session.createdAt,
              workspaceId: session.workspaceId,
              inputMode: session.inputMode,
              summarySnippet: session.summarySnippet,
              actionCount: session.actionCount,
              presetId: session.presetId as ActionBoardRow["presetId"],
              review: {
                emailApproved: Boolean(session.review?.emailApproved),
                tasksApproved: Boolean(session.review?.tasksApproved),
                executed: Boolean(session.review?.executed),
              },
            })),
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load actions.");
        }
      }
    };

    loadRows();
    return () => {
      cancelled = true;
    };
  }, [historyMode]);

  const localRows = useMemo(
    () =>
      localSessions.map((session) => {
        const summary = toSessionSummary(session);
        const review = session.review ?? defaultSessionReview();
        return {
          ...summary,
          review: {
            emailApproved: review.emailApproved,
            tasksApproved: review.tasksApproved,
            executed: review.executed,
          },
        } satisfies ActionBoardRow;
      }),
    [localSessions],
  );

  const sourceRows = historyMode === "db" ? rows : localRows;

  const filteredRows = sourceRows.filter((row) => {
    const status = toReviewStatus(row.review);
    const matchStatus = statusFilter === "all" || status === statusFilter;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      row.summarySnippet.toLowerCase().includes(q) ||
      row.id.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#d9f5ff_0%,#f5f9ff_35%,#f7f6ff_60%,#ffffff_100%)] px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="rounded-3xl border border-white/60 bg-white/80 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold">Action Board</h1>
              <p className="text-sm text-slate-600">
                Execution is blocked until tasks + email are approved.
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
              <Link
                href="/open-loops"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Open Loops
              </Link>
            </div>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-[1fr_180px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by summary or id"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as ReviewStatus | "all")
              }
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="executed">Executed</option>
              <option value="all">All</option>
            </select>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-white/60 bg-white/85 shadow-[0_8px_32px_rgba(15,23,42,0.08)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Timestamp</th>
                <th className="px-4 py-3 font-semibold">Mode</th>
                <th className="px-4 py-3 font-semibold">Summary</th>
                <th className="px-4 py-3 font-semibold">Tasks</th>
                <th className="px-4 py-3 font-semibold">Approval</th>
                <th className="px-4 py-3 font-semibold">Open</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length ? (
                filteredRows.map((row) => {
                  const status = toReviewStatus(row.review);
                  return (
                    <tr key={row.id} className="border-t border-slate-200">
                      <td className="px-4 py-3">{formatTs(row.createdAt)}</td>
                      <td className="px-4 py-3 uppercase">{row.inputMode}</td>
                      <td className="max-w-md truncate px-4 py-3">{row.summarySnippet}</td>
                      <td className="px-4 py-3">{row.actionCount}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            status === "executed"
                              ? "bg-slate-100 text-slate-700"
                              : status === "approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/history/${row.id}`}
                          className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-900"
                        >
                          Open session
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No action rows found for this filter.
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
