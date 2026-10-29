import type { DatabaseSync } from 'node:sqlite';

const migrations = [
  `CREATE TABLE IF NOT EXISTS leads(id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, body TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY REFERENCES leads(id), status TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS crm_mock(id TEXT PRIMARY KEY, body TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS receipts(id TEXT PRIMARY KEY, at TEXT NOT NULL);`,
  `CREATE TABLE inbox(
     id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, body TEXT NOT NULL,
     state TEXT NOT NULL CHECK(state IN ('pending','processing','retry','completed','dead')),
     attempts INTEGER NOT NULL DEFAULT 0, available_at TEXT NOT NULL,
     received_at TEXT NOT NULL, lease_until TEXT, lease_token TEXT,
     last_error_code TEXT, completed_at TEXT);
   CREATE INDEX inbox_due ON inbox(state, available_at, lease_until);
   CREATE TABLE operations_audit(
     seq INTEGER PRIMARY KEY, target TEXT NOT NULL, actor TEXT NOT NULL,
     action TEXT NOT NULL, reason TEXT NOT NULL, at TEXT NOT NULL);`,
  `ALTER TABLE inbox ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;`,
  `CREATE TABLE ai_runs(
    id TEXT PRIMARY KEY, tool TEXT NOT NULL, lead_id TEXT, actor TEXT NOT NULL,
    state TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT, elapsed_ms INTEGER,
    model TEXT NOT NULL, prompt_version TEXT NOT NULL, reserved_tokens INTEGER NOT NULL,
    total_tokens INTEGER, estimated_cost_micros INTEGER, error_code TEXT, result TEXT,
    provider_run_id TEXT);
   CREATE INDEX runs_lead ON ai_runs(lead_id, started_at);
   CREATE INDEX runs_budget ON ai_runs(started_at, state);
   CREATE TABLE workspace_documents(id TEXT PRIMARY KEY, lead_id TEXT NOT NULL REFERENCES leads(id),
    filename TEXT NOT NULL, media_type TEXT NOT NULL, sha256 TEXT NOT NULL, source TEXT NOT NULL,
    state TEXT NOT NULL, created_at TEXT NOT NULL, run_id TEXT REFERENCES ai_runs(id),
    UNIQUE(lead_id,sha256));
   CREATE TABLE content_reviews(id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES workspace_documents(id),
    version INTEGER NOT NULL DEFAULT 1, state TEXT NOT NULL, proposed TEXT NOT NULL,
    reviewer TEXT, comment TEXT, created_at TEXT NOT NULL, expires_at TEXT NOT NULL,
    decided_at TEXT, form_token TEXT, workflow_run_id TEXT);
   CREATE TABLE connector_jobs(id TEXT PRIMARY KEY, lead_id TEXT NOT NULL REFERENCES leads(id),
    operation_key TEXT NOT NULL UNIQUE, body_hash TEXT NOT NULL, payload TEXT NOT NULL,
    state TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, available_at TEXT NOT NULL,
    lease_token TEXT, lease_until TEXT, receipt TEXT, error_code TEXT, updated_at TEXT NOT NULL);
   CREATE TABLE workflow_events(event_id TEXT PRIMARY KEY, kind TEXT NOT NULL, fingerprint TEXT NOT NULL,
    received_at TEXT NOT NULL, result TEXT NOT NULL);`,
  `ALTER TABLE content_reviews ADD COLUMN intended_action TEXT;`,
];

/** v1's unversioned tables are adopted by IF NOT EXISTS; all later migrations are atomic. */
export function migrate(db: DatabaseSync): void {
  db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  db.exec('BEGIN IMMEDIATE');
  try {
    const version = Number(
      (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version,
    );
    if (version > migrations.length) throw new Error('DATABASE_NEWER_THAN_APPLICATION');
    for (let i = version; i < migrations.length; i++) {
      db.exec(migrations[i]);
      db.exec(`PRAGMA user_version=${i + 1}`);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
