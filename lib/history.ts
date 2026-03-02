import type { PresetId } from "@/lib/presets";
import type { ProcessResponse } from "@/lib/schema";

const STORAGE_KEY = "voice_to_action_sessions_v3";
const HISTORY_EVENT = "voice-to-action-history-updated";
const MAX_LOCAL_SESSIONS = 25;

export type SessionReview = {
  emailApproved: boolean;
  tasksApproved: boolean;
  taskOwners: Record<string, string>;
  comments: string[];
};

export type StoredSession = {
  id: string;
  createdAt: string;
  workspaceId: string;
  presetId: PresetId;
  pinned: boolean;
  tags: string[];
  review: SessionReview;
  data: ProcessResponse;
};

type HistoryEnvelopeV3 = {
  version: 3;
  sessions: StoredSession[];
};

type LegacySession = {
  id: string;
  createdAt: string;
  workspaceId?: string;
  presetId?: string;
  pinned?: boolean;
  tags?: string[];
  review?: SessionReview;
  data?: ProcessResponse;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function emptyReview(): SessionReview {
  return {
    emailApproved: false,
    tasksApproved: false,
    taskOwners: {},
    comments: [],
  };
}

function normalizeSession(entry: LegacySession): StoredSession | null {
  if (!entry?.id || !entry?.createdAt || !entry?.data) {
    return null;
  }

  return {
    id: entry.id,
    createdAt: entry.createdAt,
    workspaceId: entry.workspaceId ?? "default-workspace",
    presetId: (entry.presetId ?? "support_recap") as PresetId,
    pinned: Boolean(entry.pinned),
    tags: Array.isArray(entry.tags)
      ? entry.tags.filter((tag) => typeof tag === "string").slice(0, 8)
      : [],
    review: entry.review ?? emptyReview(),
    data: entry.data as ProcessResponse,
  };
}

function toEnvelope(input: unknown): HistoryEnvelopeV3 {
  if (
    typeof input === "object" &&
    input !== null &&
    "version" in input &&
    (input as { version?: unknown }).version === 3 &&
    Array.isArray((input as { sessions?: unknown }).sessions)
  ) {
    const withSessions = input as unknown as { sessions: LegacySession[] };
    const sessions = withSessions.sessions
      .map((entry) => normalizeSession(entry))
      .filter((entry) => Boolean(entry)) as StoredSession[];

    return {
      version: 3,
      sessions,
    };
  }

  if (
    typeof input === "object" &&
    input !== null &&
    "version" in input &&
    (input as { version?: unknown }).version === 2 &&
    Array.isArray((input as { sessions?: unknown }).sessions)
  ) {
    const withSessions = input as unknown as { sessions: LegacySession[] };
    const sessions = withSessions.sessions
      .map((entry) => normalizeSession(entry))
      .filter((entry) => Boolean(entry)) as StoredSession[];

    return {
      version: 3,
      sessions,
    };
  }

  if (Array.isArray(input)) {
    const migrated = (input as LegacySession[]).map((entry) => normalizeSession(entry));

    return {
      version: 3,
      sessions: migrated.filter((entry) => Boolean(entry)) as StoredSession[],
    };
  }

  return {
    version: 3,
    sessions: [],
  };
}

function readEnvelope(): HistoryEnvelopeV3 {
  if (!isBrowser()) {
    return { version: 3, sessions: [] };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { version: 3, sessions: [] };
    }

    const parsed = JSON.parse(raw) as unknown;
    const envelope = toEnvelope(parsed);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    return envelope;
  } catch {
    return { version: 3, sessions: [] };
  }
}

function writeEnvelope(envelope: HistoryEnvelopeV3) {
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
    version: 3,
    sessions: next,
  });
}

export function removeLocalSession(sessionId: string) {
  const next = listLocalSessions().filter((session) => session.id !== sessionId);
  writeEnvelope({
    version: 3,
    sessions: next,
  });
}

export function clearAllLocalSessions() {
  writeEnvelope({
    version: 3,
    sessions: [],
  });
}

export function updateLocalSession(
  sessionId: string,
  patch: Partial<
    Pick<StoredSession, "pinned" | "tags" | "review" | "workspaceId" | "presetId">
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
    };
  });

  writeEnvelope({
    version: 3,
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
    version: 3,
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
