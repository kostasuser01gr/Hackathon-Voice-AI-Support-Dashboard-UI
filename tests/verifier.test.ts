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
});

