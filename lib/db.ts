import { Pool } from "pg";

import { getAppConfig } from "@/lib/config";
import type { ProcessResponse } from "@/lib/schema";
import {
  defaultSessionReview,
  type ApprovalEvent,
  type SessionAnalysis,
  type SessionReviewState,
} from "@/lib/session-meta";

export type DbSessionRecord = {
  id: string;
  created_at: string;
  workspace_id: string;
  user_id: string;
  input_mode: ProcessResponse["inputMode"];
  transcript: string;
  summary: string;
  tasks: string[];
  email_draft: string;
  audit_trail: ProcessResponse["auditTrail"];
  meta: ProcessResponse["meta"];
  session_index: SessionAnalysis["index"];
  verifier_report: SessionAnalysis["verifier"];
  review: SessionReviewState;
  approval_events: ApprovalEvent[];
};

let pool: Pool | null = null;
let initialized = false;

function normalizeReview(review: unknown): SessionReviewState {
  if (!review || typeof review !== "object") {
    return defaultSessionReview();
  }

  const candidate = review as Partial<SessionReviewState>;
  return {
    emailApproved: Boolean(candidate.emailApproved),
    tasksApproved: Boolean(candidate.tasksApproved),
    executed: Boolean(candidate.executed),
    taskOwners:
      candidate.taskOwners && typeof candidate.taskOwners === "object"
        ? (candidate.taskOwners as Record<string, string>)
        : {},
    comments: Array.isArray(candidate.comments)
      ? candidate.comments.filter((entry) => typeof entry === "string")
      : [],
  };
}

function normalizeAnalysis(raw: unknown): SessionAnalysis {
  const fallback: SessionAnalysis = {
    index: {
      entities: [],
      topics: [],
      urgency: "low",
      openLoops: [],
    },
    verifier: {
      ok: true,
      score: 100,
      flags: [],
      policy: "warn",
    },
  };

  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const candidate = raw as Partial<SessionAnalysis>;
  const index = candidate.index ?? fallback.index;
  const verifier = candidate.verifier ?? fallback.verifier;

  return {
    index: {
      entities: Array.isArray(index.entities)
        ? index.entities.filter((entry) => typeof entry === "string")
        : [],
      topics: Array.isArray(index.topics)
        ? index.topics.filter((entry) => typeof entry === "string")
        : [],
      urgency:
        index.urgency === "high" || index.urgency === "medium" || index.urgency === "low"
          ? index.urgency
          : "low",
      openLoops: Array.isArray(index.openLoops)
        ? index.openLoops.filter((entry) => typeof entry === "string")
        : [],
    },
    verifier: {
      ok: Boolean(verifier.ok),
      score:
        typeof verifier.score === "number" && Number.isFinite(verifier.score)
          ? Math.max(0, Math.min(100, Math.round(verifier.score)))
          : 100,
      flags: Array.isArray(verifier.flags)
        ? verifier.flags.filter((entry) => typeof entry === "string")
        : [],
      policy:
        verifier.policy === "reject" || verifier.policy === "repair" || verifier.policy === "warn"
          ? verifier.policy
          : "warn",
    },
  };
}

function normalizeApprovalEvents(input: unknown): ApprovalEvent[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.filter((entry): entry is ApprovalEvent => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    const candidate = entry as Partial<ApprovalEvent>;
    return Boolean(
      candidate.id &&
        candidate.sessionId &&
        candidate.actorId &&
        candidate.actorRole &&
        candidate.action &&
        candidate.timestamp,
    );
  });
}

function normalizeDbRow(row: DbSessionRecord): DbSessionRecord {
  const analysis = normalizeAnalysis({
    index: row.session_index,
    verifier: row.verifier_report,
  });

  return {
    ...row,
    review: normalizeReview(row.review),
    session_index: analysis.index,
    verifier_report: analysis.verifier,
    approval_events: normalizeApprovalEvents(row.approval_events),
  };
}

function getPool(): Pool {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required when HISTORY_MODE=db.");
  }

  pool = new Pool({ connectionString });
  return pool;
}

async function ensureInitialized() {
  if (initialized) {
    return;
  }

  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id uuid PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now(),
        workspace_id text NOT NULL DEFAULT 'default-workspace',
        user_id text NOT NULL DEFAULT 'demo-user',
        input_mode text NOT NULL,
        transcript text NOT NULL,
        summary text NOT NULL,
        tasks jsonb NOT NULL,
        email_draft text NOT NULL,
        audit_trail jsonb NOT NULL,
        meta jsonb NOT NULL,
        session_index jsonb NOT NULL DEFAULT '{}'::jsonb,
        verifier_report jsonb NOT NULL DEFAULT '{}'::jsonb,
        review jsonb NOT NULL DEFAULT '{}'::jsonb,
        approval_events jsonb NOT NULL DEFAULT '[]'::jsonb
      )
    `);

    await client.query(`
      ALTER TABLE sessions
      ADD COLUMN IF NOT EXISTS workspace_id text NOT NULL DEFAULT 'default-workspace'
    `);
    await client.query(`
      ALTER TABLE sessions
      ADD COLUMN IF NOT EXISTS user_id text NOT NULL DEFAULT 'demo-user'
    `);
    await client.query(`
      ALTER TABLE sessions
      ADD COLUMN IF NOT EXISTS session_index jsonb NOT NULL DEFAULT '{}'::jsonb
    `);
    await client.query(`
      ALTER TABLE sessions
      ADD COLUMN IF NOT EXISTS verifier_report jsonb NOT NULL DEFAULT '{}'::jsonb
    `);
    await client.query(`
      ALTER TABLE sessions
      ADD COLUMN IF NOT EXISTS review jsonb NOT NULL DEFAULT '{}'::jsonb
    `);
    await client.query(`
      ALTER TABLE sessions
      ADD COLUMN IF NOT EXISTS approval_events jsonb NOT NULL DEFAULT '[]'::jsonb
    `);

    initialized = true;
  } finally {
    client.release();
  }
}

export function isDbHistoryEnabled() {
  const config = getAppConfig();
  return config.historyMode === "db";
}

export async function insertSession(row: DbSessionRecord) {
  await ensureInitialized();

  await getPool().query(
    `
      INSERT INTO sessions (
        id,
        created_at,
        workspace_id,
        user_id,
        input_mode,
        transcript,
        summary,
        tasks,
        email_draft,
        audit_trail,
        meta,
        session_index,
        verifier_report,
        review,
        approval_events
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    `,
    [
      row.id,
      row.created_at,
      row.workspace_id,
      row.user_id,
      row.input_mode,
      row.transcript,
      row.summary,
      JSON.stringify(row.tasks),
      row.email_draft,
      JSON.stringify(row.audit_trail),
      JSON.stringify(row.meta),
      JSON.stringify(row.session_index),
      JSON.stringify(row.verifier_report),
      JSON.stringify(row.review),
      JSON.stringify(row.approval_events),
    ],
  );
}

export async function listSessions(params: {
  workspaceId?: string;
  userId?: string;
  search?: string;
  mode?: "voice" | "text" | "all";
  limit?: number;
}) {
  await ensureInitialized();

  const values: Array<string | number> = [];
  const conditions: string[] = [];

  if (params.workspaceId?.trim()) {
    values.push(params.workspaceId.trim());
    conditions.push(`workspace_id = $${values.length}`);
  }

  if (params.userId?.trim()) {
    values.push(params.userId.trim());
    conditions.push(`user_id = $${values.length}`);
  }

  if (params.mode && params.mode !== "all") {
    values.push(params.mode);
    conditions.push(`input_mode = $${values.length}`);
  }

  if (params.search?.trim()) {
    values.push(`%${params.search.trim()}%`);
    conditions.push(`(summary ILIKE $${values.length} OR transcript ILIKE $${values.length})`);
  }

  values.push(Math.max(1, Math.min(params.limit ?? 100, 200)));

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await getPool().query(
    `
      SELECT id, created_at, workspace_id, user_id, input_mode, transcript, summary, tasks, email_draft, audit_trail, meta
      , session_index, verifier_report, review, approval_events
      FROM sessions
      ${where}
      ORDER BY created_at DESC
      LIMIT $${values.length}
    `,
    values,
  );

  return (result.rows as DbSessionRecord[]).map((row) => normalizeDbRow(row));
}

export async function getSessionById(id: string) {
  await ensureInitialized();

  const result = await getPool().query(
    `
      SELECT id, created_at, workspace_id, user_id, input_mode, transcript, summary, tasks, email_draft, audit_trail, meta
      , session_index, verifier_report, review, approval_events
      FROM sessions
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  const row = (result.rows[0] as DbSessionRecord | undefined) ?? null;
  return row ? normalizeDbRow(row) : null;
}

export async function updateSessionReview(
  sessionId: string,
  review: SessionReviewState,
) {
  await ensureInitialized();
  await getPool().query(
    `
      UPDATE sessions
      SET review = $2
      WHERE id = $1
    `,
    [sessionId, JSON.stringify(review)],
  );
}

export async function appendApprovalEvent(
  sessionId: string,
  event: ApprovalEvent,
) {
  await ensureInitialized();
  await getPool().query(
    `
      UPDATE sessions
      SET approval_events = COALESCE(approval_events, '[]'::jsonb) || $2::jsonb
      WHERE id = $1
    `,
    [sessionId, JSON.stringify([event])],
  );
}

export async function pingDbConnection() {
  try {
    await ensureInitialized();
    await getPool().query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

export async function listOpenLoops(params: {
  workspaceId?: string;
  limit?: number;
}) {
  const rows = await listSessions({
    workspaceId: params.workspaceId,
    mode: "all",
    limit: params.limit ?? 100,
  });

  return rows.flatMap((row) => {
    const review = row.review ?? defaultSessionReview();
    if (review.executed) {
      return [];
    }

    return row.tasks.map((task) => ({
      sessionId: row.id,
      summarySnippet: row.summary.slice(0, 120),
      task,
      createdAt: row.created_at,
      urgency: row.session_index?.urgency ?? "low",
    }));
  });
}
