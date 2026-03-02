type IntegrationJob = {
  id: string;
  createdAt: string;
  service: "gmail" | "calendar" | "jira_zendesk";
  mode: "dry_run" | "connect_stub";
  payload: Record<string, unknown>;
  status: "queued" | "running" | "completed" | "failed";
  result?: string;
};

const jobs = new Map<string, IntegrationJob>();

function makeJobId() {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function runJob(job: IntegrationJob) {
  job.status = "running";
  jobs.set(job.id, job);

  setTimeout(() => {
    job.status = "completed";
    job.result = `Mock ${job.mode} completed for ${job.service}.`;
    jobs.set(job.id, job);
  }, 500);
}

export function enqueueIntegrationJob(params: {
  service: IntegrationJob["service"];
  mode: IntegrationJob["mode"];
  payload: Record<string, unknown>;
}) {
  const job: IntegrationJob = {
    id: makeJobId(),
    createdAt: new Date().toISOString(),
    service: params.service,
    mode: params.mode,
    payload: params.payload,
    status: "queued",
  };

  jobs.set(job.id, job);
  runJob(job);
  return job;
}

export function getIntegrationJob(jobId: string) {
  return jobs.get(jobId) ?? null;
}
