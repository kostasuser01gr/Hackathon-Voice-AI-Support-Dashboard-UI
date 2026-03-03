import type { IntegrationsMode, VerifierPolicy } from "@/lib/config";

export type SessionUrgency = "low" | "medium" | "high";

export type SessionIndex = {
  entities: string[];
  topics: string[];
  urgency: SessionUrgency;
  openLoops: string[];
};

export type VerifierReport = {
  ok: boolean;
  score: number;
  flags: string[];
  policy: VerifierPolicy;
};

export type SessionAnalysis = {
  index: SessionIndex;
  verifier: VerifierReport;
};

export type ApprovalAction = "approve_email" | "approve_tasks" | "comment" | "execute";

export type ApprovalEvent = {
  id: string;
  sessionId: string;
  action: ApprovalAction;
  actorId: string;
  actorRole: "owner" | "admin" | "agent" | "viewer";
  timestamp: string;
  note?: string;
};

export type SessionReviewState = {
  emailApproved: boolean;
  tasksApproved: boolean;
  executed: boolean;
  taskOwners: Record<string, string>;
  comments: string[];
};

export type IntegrationExecutionRequest = {
  sessionId?: string;
  service: "gmail" | "calendar" | "jira_zendesk";
  mode: IntegrationsMode;
  action: "dry_run" | "connect_stub" | "execute";
  payload: Record<string, unknown>;
  idempotencyKey?: string;
};

export type OpenLoopItem = {
  sessionId: string;
  summarySnippet: string;
  task: string;
  createdAt: string;
  urgency: SessionUrgency;
};

export function defaultSessionReview(): SessionReviewState {
  return {
    emailApproved: false,
    tasksApproved: false,
    executed: false,
    taskOwners: {},
    comments: [],
  };
}

export function makeApprovalEvent(params: {
  sessionId: string;
  actorId: string;
  actorRole: ApprovalEvent["actorRole"];
  action: ApprovalAction;
  note?: string;
}) {
  return {
    id: crypto.randomUUID(),
    sessionId: params.sessionId,
    action: params.action,
    actorId: params.actorId,
    actorRole: params.actorRole,
    timestamp: new Date().toISOString(),
    note: params.note,
  } satisfies ApprovalEvent;
}
