import { beforeEach, describe, expect, it } from "vitest";

import {
  enqueueIntegrationExecution,
  getIntegrationJob,
  resetIntegrationJobsForTests,
  retryIntegrationJob,
} from "@/lib/jobQueue";

describe("integration job queue", () => {
  beforeEach(() => {
    resetIntegrationJobsForTests();
  });

  it("reuses idempotent execution requests", () => {
    const actor = { workspaceId: "w1", userId: "u1" };

    const first = enqueueIntegrationExecution(
      {
        mode: "mock",
        service: "gmail",
        action: "execute",
        payload: { subject: "A" },
        idempotencyKey: "dedupe-key",
      },
      actor,
    );
    const second = enqueueIntegrationExecution(
      {
        mode: "mock",
        service: "gmail",
        action: "execute",
        payload: { subject: "A" },
        idempotencyKey: "dedupe-key",
      },
      actor,
    );

    expect(first.reused).toBe(false);
    expect(second.reused).toBe(true);
    expect(second.job.id).toBe(first.job.id);
  });

  it("creates a retry job from an existing job", async () => {
    const actor = { workspaceId: "w1", userId: "u1" };
    const first = enqueueIntegrationExecution(
      {
        mode: "mock",
        service: "calendar",
        action: "dry_run",
        payload: { title: "sync" },
      },
      actor,
    );

    const retry = retryIntegrationJob(first.job.id, actor);

    expect(retry).not.toBeNull();
    expect(retry?.sourceJobId).toBe(first.job.id);
    expect(retry?.attempt).toBe(2);
    expect(getIntegrationJob(retry!.id)?.status).toBeTruthy();
  });
});

