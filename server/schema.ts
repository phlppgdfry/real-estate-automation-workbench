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
