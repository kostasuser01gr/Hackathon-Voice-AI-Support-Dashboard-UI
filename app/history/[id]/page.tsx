"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { VoiceActionDashboard } from "@/components/voice-action-dashboard";
import {
  getLocalHistoryServerSnapshot,
  getLocalHistorySnapshot,
  subscribeLocalHistory,
  type StoredSession,
} from "@/lib/history";
import { DEFAULT_PRESET_ID, type PresetId } from "@/lib/presets";
import { HealthResponseSchema, type HealthResponse, type ProcessResponse } from "@/lib/schema";
import { defaultSessionReview } from "@/lib/session-meta";

export default function HistoryDetailPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params?.id;
  const localSessions = useSyncExternalStore(
    subscribeLocalHistory,
    getLocalHistorySnapshot,
    getLocalHistoryServerSnapshot,
  );

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [dbSession, setDbSession] = useState<StoredSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
    if (!sessionId || health?.diagnostics.historyMode !== "db") {
      return;
    }

    let cancelled = false;

    const loadDbSession = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/history/${sessionId}`, { cache: "no-store" });
        const payload = (await response.json()) as {
          session?: {
            id: string;
            createdAt: string;
            workspaceId?: string;
            userId?: string;
            presetId?: string;
            review?: StoredSession["review"];
            analysis?: StoredSession["analysis"];
            approvalEvents?: StoredSession["approvalEvents"];
            data: ProcessResponse;
          };
          error?: { message?: string };
        };

        if (!response.ok || !payload.session) {
          throw new Error(payload.error?.message ?? "Session not found.");
        }

        if (!cancelled) {
          setDbSession({
            id: payload.session.id,
            createdAt: payload.session.createdAt,
            workspaceId: payload.session.workspaceId ?? "default-workspace",
            presetId: (payload.session.presetId ?? DEFAULT_PRESET_ID) as PresetId,
            pinned: false,
            tags: [],
            review: payload.session.review ?? defaultSessionReview(),
            analysis: payload.session.analysis ?? {
              index: { entities: [], topics: [], urgency: "low", openLoops: [] },
              verifier: { ok: true, score: 100, flags: [], policy: "warn" },
            },
            approvalEvents: payload.session.approvalEvents ?? [],
            data: payload.session.data,
          });
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load session.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDbSession();

    return () => {
      cancelled = true;
    };
  }, [health?.diagnostics.historyMode, sessionId]);

  const localSession = useMemo(() => {
    if (!sessionId) {
      return null;
    }

    return localSessions.find((session) => session.id === sessionId) ?? null;
  }, [localSessions, sessionId]);

  if (!sessionId) {
    return <div className="p-6 text-slate-700">Missing session id.</div>;
  }

  if (health?.diagnostics.historyMode === "db") {
    if (loading) {
      return <div className="p-6 text-slate-700">Loading DB session...</div>;
    }

    if (!dbSession) {
      return (
        <div className="min-h-screen bg-slate-50 px-4 py-8">
          <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center">
            <h1 className="text-2xl font-semibold">Session unavailable</h1>
            <p className="mt-2 text-sm text-slate-600">{error || "Session not found."}</p>
            <Link
              href="/history"
              className="mt-4 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Back to history
            </Link>
          </div>
        </div>
      );
    }

    return <VoiceActionDashboard key={dbSession.id} initialSession={dbSession} />;
  }

  if (!localSession) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <h1 className="text-2xl font-semibold">Session unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">
            This local session could not be found in browser storage.
          </p>
          <Link
            href="/history"
            className="mt-4 inline-flex rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Back to history
          </Link>
        </div>
      </div>
    );
  }

  return <VoiceActionDashboard key={localSession.id} initialSession={localSession} />;
}
