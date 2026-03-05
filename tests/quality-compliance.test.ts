import { describe, expect, it } from "vitest";

import { redactPiiText } from "@/lib/compliance";
import { scoreQuality } from "@/lib/quality";

describe("quality scoring", () => {
  it("returns full score for valid output", () => {
    const report = scoreQuality({
      summary: "Team completed release tasks.",
      taskList: ["Send release note", "Schedule QA sync"],
      emailDraft:
        "Subject: Release Update\n\nRelease tasks are complete.\n\nPlease review before sending.",
    });

    expect(report.score).toBe(100);
    expect(report.checks.emailHasSubject).toBe(true);
  });
});

describe("PII redaction", () => {
  it("redacts phone numbers and emails", () => {
    const redacted = redactPiiText("Contact me at test@example.com or +30 123 456 7890.");
    expect(redacted.output).toContain("[REDACTED_EMAIL]");
    expect(redacted.output).toContain("[REDACTED_PHONE]");
    expect(redacted.redactions).toBeGreaterThanOrEqual(2);
  });
});
