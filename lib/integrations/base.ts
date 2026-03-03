import type { IntegrationsMode } from "@/lib/config";

export type IntegrationService = "gmail" | "calendar" | "jira_zendesk";
export type IntegrationAction = "dry_run" | "connect_stub" | "execute";

export type IntegrationExecutionInput = {
  service: IntegrationService;
  mode: IntegrationsMode;
  action: IntegrationAction;
  payload: Record<string, unknown>;
  workspaceId: string;
  userId: string;
  sessionId?: string;
};

export type IntegrationExecutionResult = {
  ok: boolean;
  message: string;
  output?: Record<string, unknown>;
};

export type IntegrationProvider = {
  id: string;
  supports: IntegrationService[];
  execute: (input: IntegrationExecutionInput) => Promise<IntegrationExecutionResult>;
};
