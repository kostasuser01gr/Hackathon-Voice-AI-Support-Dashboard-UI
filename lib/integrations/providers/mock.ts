import type {
  IntegrationExecutionInput,
  IntegrationExecutionResult,
  IntegrationProvider,
} from "@/lib/integrations/base";

function compactPayload(payload: Record<string, unknown>) {
  try {
    return JSON.stringify(payload).slice(0, 320);
  } catch {
    return "[unserializable payload]";
  }
}

export const mockIntegrationProvider: IntegrationProvider = {
  id: "mock",
  supports: ["gmail", "calendar", "jira_zendesk"],
  async execute(input: IntegrationExecutionInput): Promise<IntegrationExecutionResult> {
    const preview = compactPayload(input.payload);
    const message = `Mock ${input.action} executed for ${input.service}.`;

    return {
      ok: true,
      message,
      output: {
        provider: "mock",
        mode: input.mode,
        service: input.service,
        preview,
      },
    };
  },
};

