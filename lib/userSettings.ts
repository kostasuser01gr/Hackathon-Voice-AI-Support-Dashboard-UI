import type { PresetId } from "@/lib/presets";

export type UserTone = "neutral" | "pro";

export type UserSettings = {
  storeHistory: boolean;
  defaultPreset: PresetId;
  language: string;
  tone: UserTone;
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
  lastLatencyMs: null,
  lastValidation: null,
};

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

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
  return readUserSettings();
}

export function getUserSettingsServerSnapshot() {
  return defaultSettings;
}
