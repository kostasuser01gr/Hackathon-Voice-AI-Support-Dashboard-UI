import { GoogleGenAI } from "@google/genai";

import { DEFAULT_GEMINI_MODEL } from "@/lib/config";
import type { Preset } from "@/lib/presets";
import { buildProcessPrompt, getProcessSystemInstruction } from "@/lib/prompts";
import {
  ProcessResponseJsonSchema,
  ProcessResponseSchema,
  type InputMode,
  type ProcessResponse,
} from "@/lib/schema";

export class GeminiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiConfigError";
  }
}

export class GeminiResponseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiResponseValidationError";
  }
}

type GenerateStructuredResponseParams = {
  inputMode: InputMode;
  transcript: string;
  preset: Preset;
  requestId: string;
  model?: string;
  promptVersion?: string;
};

export async function generateStructuredResponse(
  params: GenerateStructuredResponseParams,
): Promise<{ output: ProcessResponse; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiConfigError(
      "Missing GEMINI_API_KEY. Add it to .env.local before processing.",
    );
  }

  const model = params.model ?? DEFAULT_GEMINI_MODEL;
  const promptVersion = params.promptVersion ?? "v1";
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model,
    contents: buildProcessPrompt({
      inputMode: params.inputMode,
      transcript: params.transcript,
      preset: params.preset,
      requestId: params.requestId,
      promptVersion,
    }),
    config: {
      systemInstruction: getProcessSystemInstruction(promptVersion),
      responseMimeType: "application/json",
      responseJsonSchema: ProcessResponseJsonSchema,
      temperature: 0.2,
    },
  });

  if (!response.text) {
    throw new GeminiResponseValidationError("Gemini returned an empty response body.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    throw new GeminiResponseValidationError(
      "Gemini structured output was not valid JSON.",
    );
  }

  const validated = ProcessResponseSchema.safeParse(parsed);

  if (!validated.success) {
    throw new GeminiResponseValidationError(
      `Gemini JSON failed schema validation: ${validated.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`,
    );
  }

  return {
    output: validated.data,
    model,
  };
}
