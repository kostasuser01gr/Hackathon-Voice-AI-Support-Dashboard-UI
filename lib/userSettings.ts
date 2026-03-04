import type { PresetId } from "@/lib/presets";

export type UserTone = "neutral" | "pro";

export type UserSettings = {
  storeHistory: boolean;
  defaultPreset: PresetId;
  language: string;
  tone: UserTone;
  workspaceId: string;
  userId: string;
  redactPii: boolean;
  retentionDays: number;
  lastLatencyMs: number | null;
  lastValidation: "passed" | "failed" | null;
};

const STORAGE_KEY = "voice_to_action_user_settings_v1";
const SETTINGS_EVENT = "voice-to-action-settings-updated";

const defaultSettings: UserSettings = {
  storeHistory: true,
  defaultPreset: "support_recap",
  language: "en-US",
  tone: "neutral",
  workspaceId: "default-workspace",
  userId: "demo-user",
  redactPii: false,
  retentionDays: 30,
  lastLatencyMs: null,
  lastValidation: null,
};

let cachedSettingsRaw: string | null = null;
let cachedSettingsValue: UserSettings = defaultSettings;

function isBrowser() {
  return typeof window !== "undefined";
}

function parseSettings(input: unknown): UserSettings {
  if (typeof input !== "object" || input === null) {
    return defaultSettings;
  }

  const obj = input as Partial<UserSettings>;

  return {
    storeHistory:
      typeof obj.storeHistory === "boolean"
        ? obj.storeHistory
        : defaultSettings.storeHistory,
    defaultPreset:
      typeof obj.defaultPreset === "string"
        ? (obj.defaultPreset as PresetId)
        : defaultSettings.defaultPreset,
    language:
      typeof obj.language === "string" && obj.language.trim()
        ? obj.language
        : defaultSettings.language,
    tone: obj.tone === "pro" ? "pro" : "neutral",
    workspaceId:
      typeof obj.workspaceId === "string" && obj.workspaceId.trim()
        ? obj.workspaceId
        : defaultSettings.workspaceId,
    userId:
      typeof obj.userId === "string" && obj.userId.trim()
        ? obj.userId
        : defaultSettings.userId,
    redactPii: typeof obj.redactPii === "boolean" ? obj.redactPii : false,
    retentionDays:
      typeof obj.retentionDays === "number" && obj.retentionDays >= 1
        ? Math.min(365, Math.round(obj.retentionDays))
        : defaultSettings.retentionDays,
    lastLatencyMs:
      typeof obj.lastLatencyMs === "number" && obj.lastLatencyMs >= 0
        ? obj.lastLatencyMs
        : null,
    lastValidation:
      obj.lastValidation === "passed" || obj.lastValidation === "failed"
        ? obj.lastValidation
        : null,
  };
}

export function readUserSettings(): UserSettings {
  if (!isBrowser()) {
    return defaultSettings;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultSettings;
    }

    return parseSettings(JSON.parse(raw));
  } catch {
    return defaultSettings;
  }
}

export function writeUserSettings(next: UserSettings) {
  if (!isBrowser()) {
    return;
  }

  const normalized = parseSettings(next);
  const raw = JSON.stringify(normalized);
  cachedSettingsRaw = raw;
  cachedSettingsValue = normalized;
  window.localStorage.setItem(STORAGE_KEY, raw);
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}

export function patchUserSettings(patch: Partial<UserSettings>) {
  const current = readUserSettings();
  writeUserSettings({
    ...current,
    ...patch,
  });
}

export function subscribeUserSettings(listener: () => void) {
  if (!isBrowser()) {
    return () => {};
  }

  const onStorage = () => listener();
  const onInternal = () => listener();

  window.addEventListener("storage", onStorage);
  window.addEventListener(SETTINGS_EVENT, onInternal);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SETTINGS_EVENT, onInternal);
  };
}

export function getUserSettingsSnapshot() {
  if (!isBrowser()) {
    return defaultSettings;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedSettingsRaw) {
    return cachedSettingsValue;
  }

  cachedSettingsRaw = raw;
  if (!raw) {
    cachedSettingsValue = defaultSettings;
    return cachedSettingsValue;
  }

  try {
    cachedSettingsValue = parseSettings(JSON.parse(raw));
  } catch {
    cachedSettingsValue = defaultSettings;
  }

  return cachedSettingsValue;
}

export function getUserSettingsServerSnapshot() {
  return defaultSettings;
}
