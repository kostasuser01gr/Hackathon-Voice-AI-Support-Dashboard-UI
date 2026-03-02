const DICTIONARY = {
  "en-US": {
    dashboard: "Dashboard",
    process: "Process",
    export: "Export",
    history: "History",
    settings: "Settings",
    integrations: "Integrations",
    listening: "Listening",
    processing: "Processing",
    idle: "Idle",
    error: "Error",
  },
  "es-ES": {
    dashboard: "Panel",
    process: "Procesar",
    export: "Exportar",
    history: "Historial",
    settings: "Configuración",
    integrations: "Integraciones",
    listening: "Escuchando",
    processing: "Procesando",
    idle: "Inactivo",
    error: "Error",
  },
} as const;

export type SupportedLanguage = keyof typeof DICTIONARY;

export function normalizeLanguage(input: string): SupportedLanguage {
  return input === "es-ES" ? "es-ES" : "en-US";
}

export function t(language: string, key: keyof (typeof DICTIONARY)["en-US"]) {
  const normalized = normalizeLanguage(language);
  return DICTIONARY[normalized][key];
}
