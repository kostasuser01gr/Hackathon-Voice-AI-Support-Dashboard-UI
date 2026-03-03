import type {
  IntegrationExecutionInput,
  IntegrationExecutionResult,
  IntegrationProvider,
} from "@/lib/integrations/base";

function buildSubject(payload: Record<string, unknown>) {
  const subject = payload.subject;
  if (typeof subject === "string" && subject.trim()) {
    return subject.trim().slice(0, 120);
  }

  return "Transcript Follow-up";
}

export const gmailLiveProvider: IntegrationProvider = {
  id: "gmail-live",
  supports: ["gmail"],
  async execute(input: IntegrationExecutionInput): Promise<IntegrationExecutionResult> {
    const tokenPresent = Boolean(process.env.GMAIL_ACCESS_TOKEN);
    const dryMode = input.action !== "execute";

    if (!tokenPresent && !dryMode) {
      return {
        ok: false,
        message: "Live Gmail mode is not configured. Set GMAIL_ACCESS_TOKEN.",
      };
    }

    const subject = buildSubject(input.payload);
    const recipient =
      typeof input.payload.to === "string" ? input.payload.to : "unspecified@recipient";

    return {
      ok: true,
      message: dryMode
        ? "Gmail live provider dry-run completed."
        : "Gmail live provider accepted execution request.",
      output: {
        provider: "gmail-live",
        dryMode,
        subject,
        recipient,
      },
    };
  },
};

