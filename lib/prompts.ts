import type { Preset } from "@/lib/presets";
import type { InputMode } from "@/lib/schema";

export const PROCESS_SYSTEM_INSTRUCTION = `You are a strict voice-to-action assistant.

Non-negotiable constraints:
1) Derive every claim strictly from transcript content.
2) Never invent names, entities, dates, actions, or commitments.
3) If unsure, be conservative and minimal.
4) Output valid JSON only, conforming to the provided schema.
5) Keep summary concise (1 to 3 sentences).
6) Tasks must be action-oriented and grounded in transcript.
7) Email draft must include a subject line and end with: "Please review before sending."`;

type BuildPromptParams = {
  inputMode: InputMode;
  transcript: string;
  preset: Preset;
  requestId: string;
};

export function buildProcessPrompt({
  inputMode,
  transcript,
  preset,
  requestId,
}: BuildPromptParams): string {
  return [
    `Request ID: ${requestId}`,
    `Input Mode: ${inputMode}`,
    `Preset: ${preset.label}`,
    `Preset Style Guidance: ${preset.instruction}`,
    "",
    "Transcript:",
    transcript,
    "",
    "Required output requirements:",
    "- Return complete JSON matching the response schema exactly.",
    "- Keep auditTrail steps in exact order: capture, transcribe, extract, draft, safety_check.",
    "- Keep summary to 1-3 sentences.",
    "- Add at least one task only when transcript clearly contains a request or action.",
    "- Keep meta.validation as \"passed\" unless you are unable to comply, then \"failed\".",
    "- Keep meta.fallbackUsed true only if your output had to be conservative due to uncertainty.",
  ].join("\n");
}
