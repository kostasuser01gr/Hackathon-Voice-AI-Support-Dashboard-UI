CREATE TABLE IF NOT EXISTS share_token_revocations (
  token_hash text PRIMARY KEY,
  revoked_at timestamptz NOT NULL DEFAULT now(),
  reason text
);

CREATE TABLE IF NOT EXISTS workspace_memberships (
  workspace_id text NOT NULL,
  user_id text NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_workspace_created_desc
ON sessions (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_workspace_mode_created_desc
ON sessions (workspace_id, input_mode, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_summary_transcript_fts
ON sessions USING GIN (
  to_tsvector('simple', coalesce(summary, '') || ' ' || coalesce(transcript, ''))
);

CREATE INDEX IF NOT EXISTS idx_jobs_workspace_created_desc
ON jobs (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_jobs_workspace_status_created_desc
ON jobs (workspace_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_share_token_revocations_revoked_at
ON share_token_revocations (revoked_at DESC);
