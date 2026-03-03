import type { IntegrationsMode } from "@/lib/config";
import type { SessionData } from "@/lib/auth";
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

function updateJob(
  jobId: string,
  patch: Partial<
    Pick<
      IntegrationJob,
      "status" | "result" | "updatedAt" | "output"
    >
  >,
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
  return next;
}

async function runJob(job: IntegrationJob) {
  updateJob(job.id, { status: "running" });

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
      updateJob(job.id, {
        status: "completed",
        result: result.message,
        output: result.output,
      });
      return;
    }

    trackIntegrationJob("failed");
    updateJob(job.id, {
      status: "failed",
      result: result.message,
      output: result.output,
    });
  } catch (error) {
    trackIntegrationJob("failed");
    updateJob(job.id, {
      status: "failed",
      result:
        error instanceof Error
          ? error.message
          : "Integration execution failed unexpectedly.",
    });
  }
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

  void runJob(job);

  return {
    job,
    reused: false,
  };
}

export function getIntegrationJob(jobId: string) {
  return jobs.get(jobId) ?? null;
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

  const createdAt = new Date().toISOString();
  const next: IntegrationJob = {
    ...source,
    id: makeJobId(),
    createdAt,
    updatedAt: createdAt,
    status: "queued",
    result: undefined,
    output: undefined,
    attempt: source.attempt + 1,
    sourceJobId: source.id,
    idempotencyKey: undefined,
  };

  jobs.set(next.id, next);
  trackIntegrationJob("retried");
  trackIntegrationJob("queued");
  void runJob(next);
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
