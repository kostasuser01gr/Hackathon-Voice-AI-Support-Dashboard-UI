import { describe, expect, it } from "vitest";

import { runSafetyCheck } from "@/lib/safety";

describe("runSafetyCheck", () => {
  it("passes valid grounded output and adds footer when missing", () => {
    const result = runSafetyCheck({
      transcript: "Please send status update to Maya by Friday.",
      summary: "Team needs a status email by Friday.",
      taskList: ["Send status update to Maya by Friday"],
      emailDraft: "Subject: Status Follow-up\n\nDraft body",
    });

    expect(result.ok).toBe(true);
    expect(result.normalized.emailDraft).toContain("Please review before sending.");
  });

  it("fails when transcript has request but no tasks", () => {
    const result = runSafetyCheck({
      transcript: "Please schedule the follow-up meeting.",
      summary: "Meeting needs to be scheduled.",
      taskList: [],
      emailDraft: "Subject: Follow-up\n\nPlease review before sending.",
    });

    expect(result.ok).toBe(false);
    expect(result.issues.join(" ")).toContain("no action items");
  });
});
