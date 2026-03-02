import type { Preset } from "@/lib/presets";
import type { InputMode } from "@/lib/schema";
import { getPromptTemplate } from "@/lib/promptRegistry";

export function getProcessSystemInstruction(promptVersion: string) {
  return getPromptTemplate(promptVersion).systemInstruction;
}

type BuildPromptParams = {
  inputMode: InputMode;
  transcript: string;
  preset: Preset;
  requestId: string;
  promptVersion: string;
};

export function buildProcessPrompt({
  inputMode,
  transcript,
  preset,
  requestId,
  promptVersion,
}: BuildPromptParams): string {
  const template = getPromptTemplate(promptVersion);

  return [
    `Request ID: ${requestId}`,
    `Prompt Version: ${template.version}`,
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
    "",
    "Prompt policy:",
    ...template.policy.map((line) => `- ${line}`),
  ].join("\n");
}
