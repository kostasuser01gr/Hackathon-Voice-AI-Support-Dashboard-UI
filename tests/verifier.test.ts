import { describe, expect, it } from "vitest";

import { runGroundingVerifier } from "@/lib/verifier";

describe("runGroundingVerifier", () => {
  it("flags empty summary and missing subject/footer", () => {
    const result = runGroundingVerifier({
      transcript: "Please send a recap to Maya today.",
      summary: "",
      taskList: ["Send recap to Maya today"],
      emailDraft: "Draft body only",
      policy: "warn",
    });

    expect(result.report.ok).toBe(false);
    expect(result.report.flags).toContain("summary_empty");
    expect(result.report.flags).toContain("email_subject_missing");
    expect(result.report.flags).toContain("email_footer_missing");
  });

  it("repairs output under repair policy", () => {
    const result = runGroundingVerifier({
      transcript: "Please schedule QA sync tomorrow and send summary to customer success.",
      summary: "This introduces New Entity that is not in transcript.",
      taskList: ["Create onboarding deck for Finance Board next month"],
      emailDraft: "Body without header",
      policy: "repair",
    });

    expect(result.repaired.emailDraft.toLowerCase()).toContain("subject:");
    expect(result.repaired.emailDraft.toLowerCase()).toContain(
      "please review before sending",
    );
    expect(result.report.score).toBeGreaterThanOrEqual(70);
  });

  it("flags non-actionable tasks and token window mismatch", () => {
    const result = runGroundingVerifier({
      transcript: "Please send release notes to Maya and schedule QA sync tomorrow.",
      summary: "A separate finance board discussion happened with external counsel.",
      taskList: ["Board decision documentation for legal counsel"],
      emailDraft:
        "Subject: External Board Update\n\nThis references counsel actions.\n\nPlease review before sending.",
      policy: "warn",
    });

    expect(result.report.ok).toBe(false);
    expect(result.report.flags).toContain("task_non_actionable");
    expect(result.report.flags).toContain("token_window_mismatch");
  });

  it("keeps verifier failed output under reject policy for route-level blocking", () => {
    const result = runGroundingVerifier({
      transcript: "Schedule the support handoff and send status to Priya.",
      summary: "A new contract was signed by Marcus yesterday.",
      taskList: ["Coordinate contract legal closure"],
      emailDraft:
        "Subject: Contract Closure\n\nProceed with legal closure.\n\nPlease review before sending.",
      policy: "reject",
    });

    expect(result.report.ok).toBe(false);
    expect(result.report.flags.some((flag) => flag.startsWith("entity_mismatch:"))).toBe(true);
  });
});
