import type { SessionData } from "@/lib/auth";
import type { IntegrationsMode } from "@/lib/config";
import { getIntegrationJobById, getPool, isDbHistoryEnabled } from "@/lib/db";
import type { IntegrationAction, IntegrationService } from "@/lib/integrations/base";
import { gmailLiveProvider } from "@/lib/integrations/providers/gmail-live";
import { mockIntegrationProvider } from "@/lib/integrations/providers/mock";
import { trackIntegrationJob } from "@/lib/observability";
import type { IntegrationExecutionRequest } from "@/lib/session-meta";

type IntegrationJobStatus = "queued" | "running" | "completed" | "failed";

export type IntegrationJob = {
  id: string;
  createdAt: string;
  updatedAt: string;
  service: IntegrationService;
  mode: IntegrationsMode;
  action: IntegrationAction;
  payload: Record<string, unknown>;
  payloadPreview: string;
  workspaceId: string;
  userId: string;
  sessionId?: string;
  idempotencyKey?: string;
  status: IntegrationJobStatus;
  attempt: number;
  sourceJobId?: string;
  result?: string;
  output?: Record<string, unknown>;
};

type EnqueueResult = {
  job: IntegrationJob;
  reused: boolean;
};

const jobs = new Map<string, IntegrationJob>();
const idempotencyMap = new Map<string, string>();

function makeJobId() {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function stringifyPayload(payload: Record<string, unknown>) {
  try {
    return JSON.stringify(payload);
  } catch {
    return "[unserializable payload]";
  }
}

function toPayloadPreview(payload: Record<string, unknown>) {
  return stringifyPayload(payload).slice(0, 350);
}

function toIdempotencyLookupKey(params: {
  workspaceId: string;
  userId: string;
  service: IntegrationService;
  action: IntegrationAction;
  key: string;
}) {
  return `${params.workspaceId}:${params.userId}:${params.service}:${params.action}:${params.key}`;
}

function resolveProvider(mode: IntegrationsMode, service: IntegrationService) {
  if (mode === "live" && gmailLiveProvider.supports.includes(service)) {
    return gmailLiveProvider;
  }

  return mockIntegrationProvider;
}

function fromDbRow(row: Awaited<ReturnType<typeof getIntegrationJobById>>) {
  if (!row) {
    return null;
  }

  const mapped: IntegrationJob = {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    service: row.service as IntegrationService,
    mode: row.mode as IntegrationsMode,
    action: row.action as IntegrationAction,
    payload:
      row.payload && typeof row.payload === "object"
        ? (row.payload as Record<string, unknown>)
        : {},
    payloadPreview: row.payload_preview,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    sessionId: row.session_id ?? undefined,
    idempotencyKey: row.idempotency_key ?? undefined,
    status: row.status as IntegrationJobStatus,
    attempt: row.attempt,
    sourceJobId: row.source_job_id ?? undefined,
    result: row.result ?? undefined,
    output:
      row.output && typeof row.output === "object"
        ? (row.output as Record<string, unknown>)
        : undefined,
  };
  jobs.set(mapped.id, mapped);
  return mapped;
}

async function persistJobToDb(job: IntegrationJob) {
  if (!isDbHistoryEnabled()) return;

  try {
    await getPool().query(
      `INSERT INTO jobs (id, created_at, updated_at, service, mode, action, payload, payload_preview, workspace_id, user_id, session_id, idempotency_key, status, attempt, source_job_id, result, output)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       ON CONFLICT (id) DO UPDATE SET
         updated_at = EXCLUDED.updated_at,
         status = EXCLUDED.status,
         result = EXCLUDED.result,
         output = EXCLUDED.output,
         attempt = EXCLUDED.attempt`,
      [
        job.id,
        job.createdAt,
        job.updatedAt,
        job.service,
        job.mode,
        job.action,
        JSON.stringify(job.payload),
        job.payloadPreview,
        job.workspaceId,
        job.userId,
        job.sessionId,
        job.idempotencyKey,
        job.status,
        job.attempt,
        job.sourceJobId,
        job.result,
        job.output ? JSON.stringify(job.output) : null,
      ],
    );
  } catch (error) {
    console.error("Failed to persist job to DB:", error);
  }
}

async function updateJob(
  jobId: string,
  patch: Partial<Pick<IntegrationJob, "status" | "result" | "updatedAt" | "output">>,
) {
  const current = jobs.get(jobId);
  if (!current) {
    return null;
  }

  const next: IntegrationJob = {
    ...current,
    ...patch,
    updatedAt: patch.updatedAt ?? new Date().toISOString(),
  };
  jobs.set(jobId, next);

  await persistJobToDb(next);
  return next;
}

async function loadJob(jobId: string) {
  const local = jobs.get(jobId);
  if (local) {
    return local;
  }

  if (!isDbHistoryEnabled()) {
    return null;
  }

  const fromDb = await getIntegrationJobById(jobId);
  return fromDbRow(fromDb);
}

export async function runIntegrationJobById(jobId: string) {
  const job = await loadJob(jobId);
  if (!job) {
    return null;
  }

  if (job.status === "running") {
    return job;
  }

  await updateJob(job.id, { status: "running" });

  const provider = resolveProvider(job.mode, job.service);

  try {
    const result = await provider.execute({
      service: job.service,
      mode: job.mode,
      action: job.action,
      payload: job.payload,
      workspaceId: job.workspaceId,
      userId: job.userId,
      sessionId: job.sessionId,
    });

    if (result.ok) {
      trackIntegrationJob("completed");
      return updateJob(job.id, {
        status: "completed",
        result: result.message,
        output: result.output,
      });
    }

    trackIntegrationJob("failed");
    return updateJob(job.id, {
      status: "failed",
      result: result.message,
      output: result.output,
    });
  } catch (error) {
    trackIntegrationJob("failed");
    return updateJob(job.id, {
      status: "failed",
      result:
        error instanceof Error
          ? error.message
          : "Integration execution failed unexpectedly.",
    });
  }
}

async function scheduleJobExecution(job: IntegrationJob) {
  // Local execution scheduler. Production deployment can replace this by
  // invoking /api/integrations/jobs/[id]/run from Cloud Tasks.
  setTimeout(() => {
    void runIntegrationJobById(job.id);
  }, 25);
}

export function enqueueIntegrationExecution(
  request: IntegrationExecutionRequest,
  actor: Pick<SessionData, "userId" | "workspaceId">,
): EnqueueResult {
  const idempotencyKey = request.idempotencyKey?.trim();

  if (idempotencyKey) {
    const lookup = toIdempotencyLookupKey({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      service: request.service,
      action: request.action,
      key: idempotencyKey,
    });
    const existingId = idempotencyMap.get(lookup);
    if (existingId) {
      const existing = jobs.get(existingId);
      if (existing) {
        return {
          job: existing,
          reused: true,
        };
      }
    }
  }

  const createdAt = new Date().toISOString();
  const job: IntegrationJob = {
    id: makeJobId(),
    createdAt,
    updatedAt: createdAt,
    service: request.service,
    mode: request.mode,
    action: request.action,
    payload: request.payload,
    payloadPreview: toPayloadPreview(request.payload),
    workspaceId: actor.workspaceId,
    userId: actor.userId,
    sessionId: request.sessionId,
    idempotencyKey,
    status: "queued",
    attempt: 1,
  };

  jobs.set(job.id, job);
  trackIntegrationJob("queued");

  void persistJobToDb(job);

  if (idempotencyKey) {
    const lookup = toIdempotencyLookupKey({
      workspaceId: actor.workspaceId,
      userId: actor.userId,
      service: request.service,
      action: request.action,
      key: idempotencyKey,
    });
    idempotencyMap.set(lookup, job.id);
  }

  void scheduleJobExecution(job);

  return {
    job,
    reused: false,
  };
}

export function getIntegrationJob(jobId: string) {
  return jobs.get(jobId) ?? null;
}

export async function getIntegrationJobWithFallback(jobId: string) {
  return loadJob(jobId);
}

function cloneAsRetryJob(source: IntegrationJob) {
  const createdAt = new Date().toISOString();
  return {
    ...source,
    id: makeJobId(),
    createdAt,
    updatedAt: createdAt,
    status: "queued" as const,
    result: undefined,
    output: undefined,
    attempt: source.attempt + 1,
    sourceJobId: source.id,
    idempotencyKey: undefined,
  };
}

export function retryIntegrationJob(
  jobId: string,
  actor?: Pick<SessionData, "userId" | "workspaceId">,
) {
  const source = jobs.get(jobId);
  if (!source) {
    return null;
  }

  if (actor && actor.workspaceId !== source.workspaceId) {
    return null;
  }

  const next = cloneAsRetryJob(source);
  jobs.set(next.id, next);
  trackIntegrationJob("retried");
  trackIntegrationJob("queued");

  void persistJobToDb(next);
  void scheduleJobExecution(next);
  return next;
}

export async function retryIntegrationJobWithFallback(
  jobId: string,
  actor?: Pick<SessionData, "userId" | "workspaceId">,
) {
  const source = (await loadJob(jobId)) ?? null;
  if (!source) {
    return null;
  }
  if (actor && actor.workspaceId !== source.workspaceId) {
    return null;
  }

  const next = cloneAsRetryJob(source);
  jobs.set(next.id, next);
  trackIntegrationJob("retried");
  trackIntegrationJob("queued");
  await persistJobToDb(next);
  await scheduleJobExecution(next);
  return next;
}

export function listIntegrationJobs(params?: {
  workspaceId?: string;
  userId?: string;
  status?: IntegrationJobStatus;
  limit?: number;
}) {
  const all = [...jobs.values()]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((job) => {
      if (params?.workspaceId && job.workspaceId !== params.workspaceId) {
        return false;
      }
      if (params?.userId && job.userId !== params.userId) {
        return false;
      }
      if (params?.status && job.status !== params.status) {
        return false;
      }
      return true;
    });

  return all.slice(0, Math.max(1, Math.min(params?.limit ?? 100, 400)));
}

export function resetIntegrationJobsForTests() {
  jobs.clear();
  idempotencyMap.clear();
}
