import { describe, expect, it } from "vitest";

import { createShareToken, parseShareToken } from "@/lib/share";

describe("share tokens", () => {
  it("creates and validates share token", () => {
    const token = createShareToken({
      id: "s1",
      createdAt: "2026-03-02T10:00:00.000Z",
      workspaceId: "default-workspace",
      presetId: "support_recap",
      pinned: false,
      tags: [],
      review: {
        emailApproved: false,
        tasksApproved: false,
        executed: false,
        taskOwners: {},
        comments: [],
      },
      analysis: {
          index: {
            entities: [],
            topics: [],
            urgency: "low",
            openLoops: [],
            openLoopsCount: 0,
          },
        verifier: {
          ok: true,
          score: 100,
          flags: [],
          policy: "warn",
        },
      },
      approvalEvents: [],
      data: {
        inputMode: "text",
        transcript: "Please send update.",
        summary: "An update should be sent.",
        actions: {
          taskList: ["Send update"],
          emailDraft:
            "Subject: Update\n\nSharing a short update.\n\nPlease review before sending.",
        },
        auditTrail: [
          { step: "capture", timestamp: "2026-03-02T10:00:00.000Z", details: "Captured" },
          { step: "transcribe", timestamp: "2026-03-02T10:00:00.000Z", details: "Transcribed" },
          { step: "extract", timestamp: "2026-03-02T10:00:00.000Z", details: "Extracted" },
          { step: "draft", timestamp: "2026-03-02T10:00:00.000Z", details: "Drafted" },
          { step: "safety_check", timestamp: "2026-03-02T10:00:00.000Z", details: "Checked" },
        ],
        meta: {
          requestId: "req-1",
          model: "gemini-2.0-flash",
          latencyMs: 12,
          validation: "passed",
          fallbackUsed: false,
        },
      },
    });

    const parsed = parseShareToken(token);
    expect(parsed).not.toBeNull();
    expect(parsed?.session.id).toBe("s1");
  });
});
