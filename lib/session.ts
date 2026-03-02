import type { PresetId } from "@/lib/presets";
import type { ProcessResponse } from "@/lib/schema";

export type SessionSummary = {
  id: string;
  createdAt: string;
  workspaceId?: string;
  inputMode: ProcessResponse["inputMode"];
  summarySnippet: string;
  actionCount: number;
  presetId: PresetId;
  pinned?: boolean;
  tags?: string[];
};

export type StoredSessionPayload = {
  id: string;
  createdAt: string;
  presetId: PresetId;
  workspaceId?: string;
  pinned?: boolean;
  tags?: string[];
  data: ProcessResponse;
};

export function toSessionSummary(session: StoredSessionPayload): SessionSummary {
  return {
    id: session.id,
    createdAt: session.createdAt,
    workspaceId: session.workspaceId,
    inputMode: session.data.inputMode,
    summarySnippet: session.data.summary.slice(0, 160),
    actionCount: session.data.actions.taskList.length,
    presetId: session.presetId,
    pinned: Boolean(session.pinned),
    tags: session.tags ?? [],
  };
}
