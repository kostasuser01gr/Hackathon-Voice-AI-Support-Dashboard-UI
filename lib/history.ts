import type { PresetId } from "@/lib/presets";
import type { ProcessResponse } from "@/lib/schema";
import {
  defaultSessionReview,
  type ApprovalEvent,
  type SessionAnalysis,
  type SessionReviewState,
} from "@/lib/session-meta";

const STORAGE_KEY = "voice_to_action_sessions_v4";
const HISTORY_EVENT = "voice-to-action-history-updated";
const MAX_LOCAL_SESSIONS = 25;

export type StoredSession = {
  id: string;
  createdAt: string;
  workspaceId: string;
  presetId: PresetId;
  pinned: boolean;
  tags: string[];
  review: SessionReviewState;
  analysis: SessionAnalysis;
  approvalEvents: ApprovalEvent[];
  data: ProcessResponse;
};

type HistoryEnvelopeV4 = {
  version: 4;
  sessions: StoredSession[];
};

type LegacySession = {
  id: string;
  createdAt: string;
  workspaceId?: string;
  presetId?: string;
  pinned?: boolean;
  tags?: string[];
  review?: SessionReviewState;
  analysis?: SessionAnalysis;
  approvalEvents?: ApprovalEvent[];
  data?: ProcessResponse;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function emptyAnalysis(): SessionAnalysis {
  return {
    index: {
      entities: [],
      topics: [],
      urgency: "low",
      openLoops: [],
    },
    verifier: {
      ok: true,
      score: 100,
      flags: [],
      policy: "warn",
    },
  };
}

function normalizeSession(entry: LegacySession): StoredSession | null {
  if (!entry?.id || !entry?.createdAt || !entry?.data) {
    return null;
  }

  const reviewBase = defaultSessionReview();
  const review = {
    ...reviewBase,
    ...(entry.review ?? {}),
    taskOwners:
      entry.review?.taskOwners && typeof entry.review.taskOwners === "object"
        ? entry.review.taskOwners
        : reviewBase.taskOwners,
    comments: Array.isArray(entry.review?.comments) ? entry.review.comments : reviewBase.comments,
  };

  const analysis = entry.analysis ?? emptyAnalysis();

  return {
    id: entry.id,
    createdAt: entry.createdAt,
    workspaceId: entry.workspaceId ?? "default-workspace",
    presetId: (entry.presetId ?? "support_recap") as PresetId,
    pinned: Boolean(entry.pinned),
    tags: Array.isArray(entry.tags)
      ? entry.tags.filter((tag) => typeof tag === "string").slice(0, 8)
      : [],
    review,
    analysis: {
      index: {
        entities: Array.isArray(analysis.index?.entities) ? analysis.index.entities : [],
        topics: Array.isArray(analysis.index?.topics) ? analysis.index.topics : [],
        urgency:
          analysis.index?.urgency === "high" ||
          analysis.index?.urgency === "medium" ||
          analysis.index?.urgency === "low"
            ? analysis.index.urgency
            : "low",
        openLoops: Array.isArray(analysis.index?.openLoops) ? analysis.index.openLoops : [],
      },
      verifier: {
        ok: Boolean(analysis.verifier?.ok ?? true),
        score:
          typeof analysis.verifier?.score === "number"
            ? Math.max(0, Math.min(100, Math.round(analysis.verifier.score)))
            : 100,
        flags: Array.isArray(analysis.verifier?.flags) ? analysis.verifier.flags : [],
        policy:
          analysis.verifier?.policy === "reject" ||
          analysis.verifier?.policy === "repair" ||
          analysis.verifier?.policy === "warn"
            ? analysis.verifier.policy
            : "warn",
      },
    },
    approvalEvents: Array.isArray(entry.approvalEvents) ? entry.approvalEvents : [],
    data: entry.data as ProcessResponse,
  };
}

function toEnvelope(input: unknown): HistoryEnvelopeV4 {
  if (
    typeof input === "object" &&
    input !== null &&
    "version" in input &&
    (input as { version?: unknown }).version === 4 &&
    Array.isArray((input as { sessions?: unknown }).sessions)
  ) {
    const withSessions = input as unknown as { sessions: LegacySession[] };
    const sessions = withSessions.sessions
      .map((entry) => normalizeSession(entry))
      .filter((entry) => Boolean(entry)) as StoredSession[];

    return {
      version: 4,
      sessions,
    };
  }

  if (
    typeof input === "object" &&
    input !== null &&
    "version" in input &&
    ((input as { version?: unknown }).version === 2 ||
      (input as { version?: unknown }).version === 3) &&
    Array.isArray((input as { sessions?: unknown }).sessions)
  ) {
    const withSessions = input as unknown as { sessions: LegacySession[] };
    const sessions = withSessions.sessions
      .map((entry) => normalizeSession(entry))
      .filter((entry) => Boolean(entry)) as StoredSession[];

    return {
      version: 4,
      sessions,
    };
  }

  if (Array.isArray(input)) {
    const migrated = (input as LegacySession[]).map((entry) => normalizeSession(entry));

    return {
      version: 4,
      sessions: migrated.filter((entry) => Boolean(entry)) as StoredSession[],
    };
  }

  return {
    version: 4,
    sessions: [],
  };
}

function readEnvelope(): HistoryEnvelopeV4 {
  if (!isBrowser()) {
    return { version: 4, sessions: [] };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { version: 4, sessions: [] };
    }

    const parsed = JSON.parse(raw) as unknown;
    const envelope = toEnvelope(parsed);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    return envelope;
  } catch {
    return { version: 4, sessions: [] };
  }
}

function writeEnvelope(envelope: HistoryEnvelopeV4) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  window.dispatchEvent(new Event(HISTORY_EVENT));
}

export function listLocalSessions(): StoredSession[] {
  return readEnvelope().sessions;
}

export function getLocalSessionById(id: string): StoredSession | null {
  return listLocalSessions().find((session) => session.id === id) ?? null;
}

export function saveLocalSession(session: StoredSession) {
  const existing = listLocalSessions().filter((item) => item.id !== session.id);
  const next = [session, ...existing].slice(0, MAX_LOCAL_SESSIONS);

  writeEnvelope({
    version: 4,
    sessions: next,
  });
}

export function removeLocalSession(sessionId: string) {
  const next = listLocalSessions().filter((session) => session.id !== sessionId);
  writeEnvelope({
    version: 4,
    sessions: next,
  });
}

export function clearAllLocalSessions() {
  writeEnvelope({
    version: 4,
    sessions: [],
  });
}

export function updateLocalSession(
  sessionId: string,
  patch: Partial<
    Pick<
      StoredSession,
      | "pinned"
      | "tags"
      | "review"
      | "workspaceId"
      | "presetId"
      | "analysis"
      | "approvalEvents"
    >
  >,
) {
  const next = listLocalSessions().map((session) => {
    if (session.id !== sessionId) {
      return session;
    }

    return {
      ...session,
      ...patch,
      review: patch.review ? { ...session.review, ...patch.review } : session.review,
      analysis: patch.analysis ? { ...session.analysis, ...patch.analysis } : session.analysis,
      approvalEvents: patch.approvalEvents ?? session.approvalEvents,
    };
  });

  writeEnvelope({
    version: 4,
    sessions: next,
  });
}

export function pruneLocalSessions(retentionDays: number) {
  const cutoff = Date.now() - Math.max(1, retentionDays) * 24 * 60 * 60 * 1000;
  const next = listLocalSessions().filter((session) => {
    const date = new Date(session.createdAt).getTime();
    return Number.isFinite(date) && date >= cutoff;
  });

  writeEnvelope({
    version: 4,
    sessions: next,
  });
}

export function subscribeLocalHistory(listener: () => void) {
  if (!isBrowser()) {
    return () => {};
  }

  const onStorage = () => listener();
  const onInternal = () => listener();

  window.addEventListener("storage", onStorage);
  window.addEventListener(HISTORY_EVENT, onInternal);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(HISTORY_EVENT, onInternal);
  };
}

export function getLocalHistorySnapshot() {
  return listLocalSessions();
}

export function getLocalHistoryServerSnapshot(): StoredSession[] {
  return [];
}
