import { describe, expect, it } from "vitest";

import { makeApprovalEvent, makeApprovalPayloadHash } from "@/lib/session-meta";

describe("approval events", () => {
  it("generates stable payload hash from event payload", () => {
    const one = makeApprovalPayloadHash({
      sessionId: "session-a",
      actorId: "user-1",
      actorRole: "agent",
      action: "comment",
      note: "Looks good",
      timestamp: "2026-03-03T09:00:00.000Z",
    });

    const two = makeApprovalPayloadHash({
      sessionId: "session-a",
      actorId: "user-1",
      actorRole: "agent",
      action: "comment",
      note: "Looks good",
      timestamp: "2026-03-03T09:00:00.000Z",
    });

    expect(one).toBe(two);
    expect(one).toMatch(/^fnv1a-/);
  });

  it("includes payload hash in generated approval event", () => {
    const event = makeApprovalEvent({
      sessionId: "session-a",
      actorId: "user-2",
      actorRole: "owner",
      action: "approve_email",
      note: "approved",
    });

    expect(event.payloadHash).toMatch(/^fnv1a-/);
    expect(event.sessionId).toBe("session-a");
    expect(event.actorRole).toBe("owner");
  });
});
