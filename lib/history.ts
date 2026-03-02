import type { PresetId } from "@/lib/presets";
import type { ProcessResponse } from "@/lib/schema";

const STORAGE_KEY = "voice_to_action_sessions_v2";
const HISTORY_EVENT = "voice-to-action-history-updated";
const MAX_LOCAL_SESSIONS = 25;

export type StoredSession = {
  id: string;
  createdAt: string;
  presetId: PresetId;
  data: ProcessResponse;
};

type HistoryEnvelopeV2 = {
  version: 2;
  sessions: StoredSession[];
};

type LegacySession = {
  id: string;
  createdAt: string;
  presetId?: string;
  data?: ProcessResponse;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function toEnvelope(input: unknown): HistoryEnvelopeV2 {
  if (
    typeof input === "object" &&
    input !== null &&
    "version" in input &&
    (input as { version?: unknown }).version === 2 &&
    Array.isArray((input as { sessions?: unknown }).sessions)
  ) {
    const withSessions = input as unknown as { sessions: StoredSession[] };
    return {
      version: 2,
      sessions: withSessions.sessions,
    };
  }

  if (Array.isArray(input)) {
    const migrated = (input as LegacySession[])
      .filter((entry) => entry?.id && entry?.createdAt && entry?.data)
      .map((entry) => ({
        id: entry.id,
        createdAt: entry.createdAt,
        presetId: (entry.presetId ?? "support_recap") as PresetId,
        data: entry.data as ProcessResponse,
      }));

    return {
      version: 2,
      sessions: migrated,
    };
  }

  return {
    version: 2,
    sessions: [],
  };
}

function readEnvelope(): HistoryEnvelopeV2 {
  if (!isBrowser()) {
    return { version: 2, sessions: [] };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { version: 2, sessions: [] };
    }

    const parsed = JSON.parse(raw) as unknown;
    const envelope = toEnvelope(parsed);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    return envelope;
  } catch {
    return { version: 2, sessions: [] };
  }
}

function writeEnvelope(envelope: HistoryEnvelopeV2) {
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
    version: 2,
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
