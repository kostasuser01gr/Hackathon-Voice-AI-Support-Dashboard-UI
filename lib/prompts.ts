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
  ragContext?: string;
};

export function buildProcessPrompt({
  inputMode,
  transcript,
  preset,
  requestId,
  promptVersion,
  ragContext,
}: BuildPromptParams): string {
  const template = getPromptTemplate(promptVersion);

  const lines = [
    `Request ID: ${requestId}`,
    `Prompt Version: ${template.version}`,
    `Input Mode: ${inputMode}`,
    `Preset: ${preset.label}`,
    `Preset Style Guidance: ${preset.instruction}`,
    "",
  ];

  if (ragContext) {
    lines.push("--- KNOWLEDGE BASE & CRM CONTEXT ---");
    lines.push(ragContext);
    lines.push("------------------------------------");
    lines.push("");
  }

  lines.push("Transcript:");
  lines.push(transcript);
  lines.push("");
  lines.push("Required output requirements:");
  lines.push("- Return complete JSON matching the response schema exactly.");
  lines.push("- Keep auditTrail steps in exact order: capture, transcribe, extract, draft, safety_check.");
  lines.push("- Keep summary to 1-3 sentences.");
  lines.push("- Add at least one task only when transcript clearly contains a request or action.");
  lines.push("- Keep meta.validation as \"passed\" unless you are unable to comply, then \"failed\".");
  lines.push("- Keep meta.fallbackUsed true only if your output had to be conservative due to uncertainty.");
  lines.push("- Make sure meta.approvalRequired is a boolean, you can leave it false.");
  lines.push("");
  lines.push("Prompt policy:");
  
  template.policy.forEach((line) => lines.push(`- ${line}`));

  return lines.join("\n");
}

