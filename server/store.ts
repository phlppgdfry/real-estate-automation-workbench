import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import {
  approve,
  createLead,
  deliver,
  DomainError,
  IntakeSchema,
  type Extraction,
  type Lead,
  type Listing,
  requeue,
} from '../src/domain';
import { migrate } from './schema';

export class Store {
  db: DatabaseSync;
  constructor(path = ':memory:') {
    this.db = new DatabaseSync(path);
    try {
      migrate(this.db);
    } catch (error) {
      this.db.close();
      throw error;
    }
  }
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
  all(): Lead[] {
    return (
      this.db.prepare('SELECT body FROM leads ORDER BY rowid DESC').all() as { body: string }[]
    ).map((x) => JSON.parse(x.body));
  }
  get(id: string): Lead {
    const row = this.db.prepare('SELECT body FROM leads WHERE id=?').get(id) as
      { body: string } | undefined;
    if (!row) throw new DomainError('NOT_FOUND', 'Aanvraag niet gevonden.');
    return JSON.parse(row.body);
  }
  save(lead: Lead) {
    this.db.prepare('UPDATE leads SET body=? WHERE id=?').run(JSON.stringify(lead), lead.id);
  }
  page(limit = 50, before?: number): { leads: Lead[]; nextCursor: number | null } {
    const rows = this.db
      .prepare('SELECT rowid cursor,body FROM leads WHERE rowid<? ORDER BY rowid DESC LIMIT ?')
      .all(before ?? Number.MAX_SAFE_INTEGER, limit + 1) as { cursor: number; body: string }[];
    return {
      leads: rows.slice(0, limit).map((r) => JSON.parse(r.body)),
      nextCursor: rows.length > limit ? Number(rows[limit - 1].cursor) : null,
    };
  }
  requeue(
    id: string,
    version: number,
    actor: string,
    reason: string,
    listings: Listing[],
    now: string,
  ): Lead {
    return this.transaction(() => {
      const next = requeue(this.get(id), version, actor, reason, listings, now);
      this.save(next);
      const result = this.db.prepare("UPDATE outbox SET status='pending' WHERE id=?").run(id);
      if (Number(result.changes) !== 1)
        throw new DomainError(
          'STATE',
          'De overdrachtopdracht ontbreekt; afstemming door beheer is nodig.',
        );
      this.db
        .prepare('INSERT INTO operations_audit(target,actor,action,reason,at) VALUES(?,?,?,?,?)')
        .run(id, actor, 'crm_requeued', reason, now);
      return next;
    });
  }
  ingest(
    raw: unknown,
    listings: Listing[],
    now: string,
    extraction?: Extraction,
  ): { lead: Lead; duplicate: boolean } {
    const input = IntakeSchema.parse(raw);
    const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    return this.transaction(() => {
      const old = this.db
        .prepare('SELECT fingerprint,body FROM leads WHERE id=?')
        .get(input.eventId) as { fingerprint: string; body: string } | undefined;
      if (old) {
        if (old.fingerprint !== fingerprint)
          throw new DomainError('IDEMPOTENCY', 'Event-ID hergebruikt met andere inhoud.');
        return { lead: JSON.parse(old.body), duplicate: true };
      }
      const lead = createLead(input, listings, now, extraction);
      this.db
        .prepare('INSERT INTO leads(id,fingerprint,body) VALUES(?,?,?)')
        .run(lead.id, fingerprint, JSON.stringify(lead));
      return { lead, duplicate: false };
    });
  }
  approve(id: string, version: number, actor: string, listings: Listing[], now: string): Lead {
    return this.transaction(() => {
      const next = approve(this.get(id), version, actor, listings, now);
      this.save(next);
      this.db.prepare('INSERT INTO outbox(id,status) VALUES(?,?)').run(id, 'pending');
      return next;
    });
  }
  /** Single-process durable mock worker. External network delivery would require lease + remote idempotency. */
  dispatch(now: string, fail = false): { processed: number; failed: number } {
    return this.transaction(() => {
      let processed = 0,
        failed = 0;
      for (const row of this.db.prepare("SELECT id FROM outbox WHERE status='pending'").all() as {
        id: string;
      }[]) {
        const lead = this.get(row.id);
        if (lead.nextAttemptAt && Date.parse(now) < Date.parse(lead.nextAttemptAt)) continue;
        const next = deliver(lead, fail, now);
        if (!fail) {
          this.db.prepare('INSERT OR IGNORE INTO crm_mock(id,body) VALUES(?,?)').run(
            lead.id,
            JSON.stringify({
              externalId: lead.id,
              name: lead.name,
              email: lead.email,
              reference: lead.extraction.reference,
              task: 'Opvolgen aanvraag',
              draft: lead.draft,
            }),
          );
          this.db.prepare('INSERT OR IGNORE INTO receipts(id,at) VALUES(?,?)').run(lead.id, now);
        }
        this.save(next);
        if (next.status !== 'queued')
          this.db.prepare('UPDATE outbox SET status=? WHERE id=?').run(next.status, lead.id);
        processed++;
        if (fail) failed++;
      }
      return { processed, failed };
    });
  }
  stats() {
    return {
      leads: Number((this.db.prepare('SELECT count(*) n FROM leads').get() as { n: number }).n),
      crmRecords: Number(
        (this.db.prepare('SELECT count(*) n FROM crm_mock').get() as { n: number }).n,
      ),
      sentEmails: 0,
    };
  }
  close() {
    this.db.close();
  }
}
