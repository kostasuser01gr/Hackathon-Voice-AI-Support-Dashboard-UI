export const PRESETS = [
  {
    id: "support_recap",
    label: "Support Recap",
    instruction:
      "Tone: calm and customer-centric. Emphasize issue status, owner, ETA, and next communication step.",
  },
  {
    id: "sales_follow_up",
    label: "Sales Follow-up",
    instruction:
      "Tone: concise and persuasive. Highlight value points, objections, and explicit next commercial actions.",
  },
  {
    id: "complaint_handling",
    label: "Complaint Handling",
    instruction:
      "Tone: empathetic and accountable. Acknowledge pain points, corrective actions, and ownership clearly.",
  },
  {
    id: "project_update",
    label: "Project Update",
    instruction:
      "Tone: execution-focused. Summarize progress, blockers, owners, and deadlines when present.",
  },
  {
    id: "meeting_minutes",
    label: "Meeting Minutes",
    instruction:
      "Tone: neutral and concise. Capture decisions, open items, and responsibilities with minimal fluff.",
  },
  {
    id: "tourism_travel_client_follow_up",
    label: "Tourism/Travel Client Follow-up",
    instruction:
      "Tone: helpful concierge style. Focus on itinerary updates, bookings, and pending client confirmations.",
  },
  {
    id: "technical_incident_summary",
    label: "Technical Incident Summary",
    instruction:
      "Tone: incident-response style. Prioritize impact, mitigation steps, and preventive follow-up actions.",
  },
  {
    id: "internal_ops_tasking",
    label: "Internal Ops Tasking",
    instruction:
      "Tone: operational and directive. Convert transcript into concrete internal tasks with clear next steps.",
  },
] as const;

export type Preset = (typeof PRESETS)[number];
export type PresetId = Preset["id"];

export const DEFAULT_PRESET_ID: PresetId = "support_recap";

const presetMap = new Map<PresetId, Preset>(
  PRESETS.map((preset) => [preset.id, preset]),
);

export function getPresetById(presetId?: string): Preset {
  if (!presetId) {
    return presetMap.get(DEFAULT_PRESET_ID)!;
  }

  return presetMap.get(presetId as PresetId) ?? presetMap.get(DEFAULT_PRESET_ID)!;
}
