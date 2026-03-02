import { NextResponse } from "next/server";

import { getAppConfig } from "@/lib/config";
import { insertSession } from "@/lib/db";
import {
  generateStructuredResponse,
  GeminiConfigError,
  GeminiResponseValidationError,
} from "@/lib/gemini";
import { getPresetById } from "@/lib/presets";
import { neutralizeProfanity } from "@/lib/profanity";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { runSafetyCheck } from "@/lib/safety";
import {
  ProcessRequestSchema,
  ProcessResponseSchema,
  type ProcessAuditEntry,
  type ProcessMeta,
  type ProcessResponse,
} from "@/lib/schema";

export const runtime = "nodejs";

type ProcessDeps = {
  now: () => string;
  nowMs: () => number;
  requestId: string;
  generateStructuredResponse: typeof generateStructuredResponse;
};

class ApiProcessError extends Error {
  status: number;
  code: string;
  auditTrail?: ProcessAuditEntry[];
  meta?: Partial<ProcessMeta>;

  constructor(params: {
    status: number;
    code: string;
    message: string;
    auditTrail?: ProcessAuditEntry[];
    meta?: Partial<ProcessMeta>;
  }) {
    super(params.message);
    this.status = params.status;
    this.code = params.code;
    this.auditTrail = params.auditTrail;
    this.meta = params.meta;
    this.name = "ApiProcessError";
  }
}

function makeAuditEntry(step: ProcessAuditEntry["step"], details: string, now: () => string) {
  return {
    step,
    timestamp: now(),
    details,
  };
}

function buildErrorResponse(error: ApiProcessError | Error, requestId: string) {
  if (error instanceof ApiProcessError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          requestId,
        },
        ...(error.auditTrail ? { auditTrail: error.auditTrail } : {}),
        ...(error.meta ? { meta: error.meta } : {}),
      },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Unexpected server error while processing transcript.",
        requestId,
      },
    },
    { status: 500 },
  );
}

function createMeta(params: {
  requestId: string;
  model: string;
  startedAt: number;
  nowMs: () => number;
  validation: "passed" | "failed";
  fallbackUsed: boolean;
}): ProcessMeta {
  return {
    requestId: params.requestId,
    model: params.model,
    latencyMs: Math.max(0, Math.round(params.nowMs() - params.startedAt)),
    validation: params.validation,
    fallbackUsed: params.fallbackUsed,
  };
}

export async function processPayload(
  payload: unknown,
  deps: Partial<ProcessDeps> = {},
): Promise<ProcessResponse> {
  const config = getAppConfig();
  const now = deps.now ?? (() => new Date().toISOString());
  const nowMs = deps.nowMs ?? (() => Date.now());
  const requestId = deps.requestId ?? crypto.randomUUID();
  const startedAt = nowMs();

  const parsed = ProcessRequestSchema.safeParse(payload);

  if (!parsed.success) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[api/process] request validation failed", {
        requestId,
        issues: parsed.error.issues,
      });
    }

    throw new ApiProcessError({
      status: 400,
      code: "BAD_REQUEST",
      message: parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "payload"}: ${issue.message}`)
        .join("; "),
      meta: createMeta({
        requestId,
        model: config.geminiModel,
        startedAt,
        nowMs,
        validation: "failed",
        fallbackUsed: false,
      }),
    });
  }

  const { inputMode, text, presetId } = parsed.data;

  if (text.length > config.maxInputChars) {
    throw new ApiProcessError({
      status: 413,
      code: "MAX_INPUT_EXCEEDED",
      message: `Input exceeds MAX_INPUT_CHARS (${config.maxInputChars}).`,
      meta: createMeta({
        requestId,
        model: config.geminiModel,
        startedAt,
        nowMs,
        validation: "failed",
        fallbackUsed: false,
      }),
    });
  }

  const preset = getPresetById(presetId);
  const transcript = text.trim();
  const auditTrail: ProcessAuditEntry[] = [
    makeAuditEntry(
      "capture",
      `Input captured in ${inputMode} mode with preset '${preset.label}'.`,
      now,
    ),
    makeAuditEntry(
      "transcribe",
      inputMode === "voice"
        ? "Client provided transcript from browser voice capture."
        : "Client provided transcript from text fallback input.",
      now,
    ),
  ];

  if (!transcript) {
    auditTrail.push(
      makeAuditEntry(
        "safety_check",
        "Validation failed: transcript is empty.",
        now,
      ),
    );

    throw new ApiProcessError({
      status: 422,
      code: "EMPTY_TRANSCRIPT",
      message: "Transcript is empty. Add speech or typed text before processing.",
      auditTrail,
      meta: createMeta({
        requestId,
        model: config.geminiModel,
        startedAt,
        nowMs,
        validation: "failed",
        fallbackUsed: false,
      }),
    });
  }

  const profanity = neutralizeProfanity(transcript);
  const cleanTranscript = profanity.sanitized;

  let modelOutput: ProcessResponse;
  let modelName = config.geminiModel;

  const generator = deps.generateStructuredResponse ?? generateStructuredResponse;

  try {
    const generated = await generator({
      inputMode,
      transcript: cleanTranscript,
      preset,
      requestId,
      model: config.geminiModel,
    });

    modelOutput = generated.output;
    modelName = generated.model;
  } catch (error) {
    auditTrail.push(
      makeAuditEntry(
        "safety_check",
        "Validation failed: structured model response was invalid.",
        now,
      ),
    );

    const safeMessage =
      error instanceof GeminiConfigError
        ? error.message
        : "Model response validation failed. Please retry.";

    throw new ApiProcessError({
      status: error instanceof GeminiConfigError ? 500 : 500,
      code:
        error instanceof GeminiConfigError
          ? "GEMINI_CONFIG_ERROR"
          : error instanceof GeminiResponseValidationError
            ? "MODEL_SCHEMA_ERROR"
            : "MODEL_ERROR",
      message: safeMessage,
      auditTrail,
      meta: createMeta({
        requestId,
        model: modelName,
        startedAt,
        nowMs,
        validation: "failed",
        fallbackUsed: false,
      }),
    });
  }

  auditTrail.push(
    makeAuditEntry(
      "extract",
      `Summary and ${modelOutput.actions.taskList.length} task(s) extracted from transcript.`,
      now,
    ),
    makeAuditEntry("draft", "Email draft generated from transcript context.", now),
  );

  const safety = runSafetyCheck({
    transcript: cleanTranscript,
    summary: modelOutput.summary,
    taskList: modelOutput.actions.taskList,
    emailDraft: modelOutput.actions.emailDraft,
  });

  if (!safety.ok) {
    auditTrail.push(
      makeAuditEntry(
        "safety_check",
        `Failed: ${safety.issues.join(" | ")}`,
        now,
      ),
    );

    throw new ApiProcessError({
      status: 422,
      code: "SAFETY_CHECK_FAILED",
      message: `Safety check failed: ${safety.issues.join(" ")}`,
      auditTrail,
      meta: createMeta({
        requestId,
        model: modelName,
        startedAt,
        nowMs,
        validation: "failed",
        fallbackUsed: safety.fallbackUsed || profanity.replacedCount > 0,
      }),
    });
  }

  auditTrail.push(
    makeAuditEntry(
      "safety_check",
      profanity.replacedCount > 0
        ? `Passed with profanity-safe normalization (${profanity.replacedCount} replacement(s)).`
        : "Passed groundedness and output checks.",
      now,
    ),
  );

  const response: ProcessResponse = {
    inputMode,
    transcript: cleanTranscript,
    summary: safety.normalized.summary,
    actions: {
      taskList: safety.normalized.taskList,
      emailDraft: safety.normalized.emailDraft,
    },
    auditTrail,
    meta: createMeta({
      requestId,
      model: modelName,
      startedAt,
      nowMs,
      validation: "passed",
      fallbackUsed: safety.fallbackUsed || profanity.replacedCount > 0,
    }),
  };

  return ProcessResponseSchema.parse(response);
}

export async function POST(request: Request) {
  const config = getAppConfig();
  const requestId = crypto.randomUUID();

  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, config.rateLimitPerMin);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: `Rate limit exceeded. Retry in ${rateLimit.retryAfterSeconds}s.`,
          requestId,
        },
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  try {
    const rawBody = await request.text();
    const maxBodyBytes = config.maxInputChars * 8 + 4000;

    if (Buffer.byteLength(rawBody, "utf8") > maxBodyBytes) {
      return NextResponse.json(
        {
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: `Request body exceeds ${maxBodyBytes} bytes.`,
            requestId,
          },
        },
        { status: 413 },
      );
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody) as unknown;
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "BAD_JSON",
            message: "Request body must be valid JSON.",
            requestId,
          },
        },
        { status: 400 },
      );
    }

    const result = await processPayload(payload, { requestId });

    const storeHistory = request.headers.get("x-store-history") !== "false";
    if (storeHistory && config.historyMode === "db") {
      try {
        await insertSession({
          id: result.meta.requestId,
          created_at: new Date().toISOString(),
          input_mode: result.inputMode,
          transcript: result.transcript,
          summary: result.summary,
          tasks: result.actions.taskList,
          email_draft: result.actions.emailDraft,
          audit_trail: result.auditTrail,
          meta: result.meta,
        });
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[api/process] failed to persist DB history", {
            requestId,
            error,
          });
        }
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[api/process] failed", { requestId, error });
    }

    if (error instanceof Error) {
      return buildErrorResponse(error as ApiProcessError | Error, requestId);
    }

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Unknown processing error.",
          requestId,
        },
      },
      { status: 500 },
    );
  }
}
