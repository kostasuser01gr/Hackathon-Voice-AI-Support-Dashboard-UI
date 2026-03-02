import { Pool } from "pg";

import { getAppConfig } from "@/lib/config";
import type { ProcessResponse } from "@/lib/schema";

export type DbSessionRecord = {
  id: string;
  created_at: string;
  input_mode: ProcessResponse["inputMode"];
  transcript: string;
  summary: string;
  tasks: string[];
  email_draft: string;
  audit_trail: ProcessResponse["auditTrail"];
  meta: ProcessResponse["meta"];
};

let pool: Pool | null = null;
let initialized = false;

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
        input_mode text NOT NULL,
        transcript text NOT NULL,
        summary text NOT NULL,
        tasks jsonb NOT NULL,
        email_draft text NOT NULL,
        audit_trail jsonb NOT NULL,
        meta jsonb NOT NULL
      )
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
        input_mode,
        transcript,
        summary,
        tasks,
        email_draft,
        audit_trail,
        meta
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `,
    [
      row.id,
      row.created_at,
      row.input_mode,
      row.transcript,
      row.summary,
      JSON.stringify(row.tasks),
      row.email_draft,
      JSON.stringify(row.audit_trail),
      JSON.stringify(row.meta),
    ],
  );
}

export async function listSessions(params: {
  search?: string;
  mode?: "voice" | "text" | "all";
  limit?: number;
}) {
  await ensureInitialized();

  const values: Array<string | number> = [];
  const conditions: string[] = [];

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
      SELECT id, created_at, input_mode, transcript, summary, tasks, email_draft, audit_trail, meta
      FROM sessions
      ${where}
      ORDER BY created_at DESC
      LIMIT $${values.length}
    `,
    values,
  );

  return result.rows as DbSessionRecord[];
}

export async function getSessionById(id: string) {
  await ensureInitialized();

  const result = await getPool().query(
    `
      SELECT id, created_at, input_mode, transcript, summary, tasks, email_draft, audit_trail, meta
      FROM sessions
      WHERE id = $1
      LIMIT 1
    `,
    [id],
  );

  return (result.rows[0] as DbSessionRecord | undefined) ?? null;
}
