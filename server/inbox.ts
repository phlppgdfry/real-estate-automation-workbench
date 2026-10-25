import { createHash, randomUUID } from 'node:crypto';
import {
  createLead,
  DomainError,
  IntakeSchema,
  type Extraction,
  type Intake,
  type Listing,
} from '../src/domain';
import type { Store } from './store';

type State = 'pending' | 'processing' | 'retry' | 'completed' | 'dead';
type Row = {
  id: string;
  fingerprint: string;
  body: string;
  state: State;
  attempts: number;
  available_at: string;
  received_at: string;
  lease_until: string | null;
  lease_token: string | null;
  last_error_code: string | null;
  completed_at: string | null;
};
export type Claim = {
  id: string;
  input: Intake;
  token: string;
  attempt: number;
  receivedAt: string;
};
export type Receipt = {
  eventId: string;
  state: State;
  attempts: number;
  duplicate: boolean;
  statusUrl: string;
};
export class Inbox {
  constructor(private store: Store) {}
  private row(id: string): Row {
    const row = this.store.db.prepare('SELECT * FROM inbox WHERE id=?').get(id) as Row | undefined;
    if (!row) throw new DomainError('NOT_FOUND', 'Ontvangst niet gevonden.');
    return row;
  }
  receipt(id: string, duplicate = false): Receipt {
    const row = this.row(id);
    return {
      eventId: row.id,
      state: row.state,
      attempts: row.attempts,
      duplicate,
      statusUrl: `/api/inbox/${row.id}`,
    };
  }
  accept(raw: unknown, now: string): Receipt {
    const input = IntakeSchema.parse(raw);
    const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    return this.store.transaction(() => {
      const existing = this.store.db
        .prepare('SELECT fingerprint FROM inbox WHERE id=?')
        .get(input.eventId) as { fingerprint: string } | undefined;
      if (existing) {
        if (existing.fingerprint !== fingerprint)
          throw new DomainError('IDEMPOTENCY', 'Event-ID hergebruikt met andere inhoud.');
        return this.receipt(input.eventId, true);
      }
      const legacy = this.store.db
        .prepare('SELECT fingerprint FROM leads WHERE id=?')
        .get(input.eventId) as { fingerprint: string } | undefined;
      if (legacy && legacy.fingerprint !== fingerprint)
        throw new DomainError('IDEMPOTENCY', 'Event-ID hergebruikt met andere inhoud.');
      this.store.db
        .prepare(
          'INSERT INTO inbox(id,fingerprint,body,state,available_at,received_at) VALUES(?,?,?,?,?,?)',
        )
        .run(
          input.eventId,
          fingerprint,
          JSON.stringify(input),
          legacy ? 'completed' : 'pending',
          now,
          now,
        );
      return this.receipt(input.eventId, Boolean(legacy));
    });
  }
  claim(now: string, leaseMs = 30000): Claim | undefined {
    return this.store.transaction(() => {
      // A crashed final attempt also has a terminal state, rather than an immortal lease.
      this.store.db
        .prepare(
          "UPDATE inbox SET state='dead',lease_token=NULL,lease_until=NULL,last_error_code='LEASE_EXHAUSTED' WHERE state='processing' AND lease_until<=? AND attempts>=3",
        )
        .run(now);
      const row = this.store.db
        .prepare(
          "SELECT * FROM inbox WHERE attempts<3 AND ((state IN ('pending','retry') AND available_at<=?) OR (state='processing' AND lease_until<=?)) ORDER BY received_at,id LIMIT 1",
        )
        .get(now, now) as Row | undefined;
      if (!row) return;
      const token = randomUUID();
      this.store.db
        .prepare(
          "UPDATE inbox SET state='processing',attempts=attempts+1,lease_token=?,lease_until=? WHERE id=?",
        )
        .run(token, new Date(Date.parse(now) + leaseMs).toISOString(), row.id);
      return {
        id: row.id,
        input: JSON.parse(row.body),
        token,
        attempt: row.attempts + 1,
        receivedAt: row.received_at,
      };
    });
  }
  private requireLease(claim: Claim, now: string): Row {
    const row = this.row(claim.id);
    if (
      row.state !== 'processing' ||
      row.lease_token !== claim.token ||
      !row.lease_until ||
      row.lease_until <= now
    )
      throw new DomainError('LEASE_LOST', 'Worker heeft geen geldige lease meer.');
    return row;
  }
  complete(claim: Claim, listings: Listing[], now: string, extraction?: Extraction): void {
    this.store.transaction(() => {
      const row = this.requireLease(claim, now);
      const lead = createLead(JSON.parse(row.body), listings, now, extraction);
      lead.receivedAt = row.received_at;
      lead.audit[0].at = row.received_at;
      this.store.db
        .prepare('INSERT INTO leads(id,fingerprint,body) VALUES(?,?,?)')
        .run(row.id, row.fingerprint, JSON.stringify(lead));
      this.store.db
        .prepare(
          "UPDATE inbox SET state='completed',completed_at=?,lease_token=NULL,lease_until=NULL,last_error_code=NULL WHERE id=?",
        )
        .run(now, row.id);
    });
  }
  fail(claim: Claim, now: string): void {
    this.store.transaction(() => {
      const row = this.requireLease(claim, now);
      const state = row.attempts >= 3 ? 'dead' : 'retry';
      this.store.db
        .prepare(
          'UPDATE inbox SET state=?,available_at=?,lease_token=NULL,lease_until=NULL,last_error_code=? WHERE id=?',
        )
        .run(
          state,
          new Date(Date.parse(now) + 1000 * 2 ** row.attempts).toISOString(),
          'ANALYSIS_FAILED',
          row.id,
        );
      // No provider error message or source text in operational records.
    });
  }
  retry(id: string, attempts: number, actor: string, reason: string, now: string): Receipt {
    if (!actor.trim() || reason.trim().length < 10 || reason.length > 500)
      throw new DomainError(
        'REASON',
        'Een beoordelaar en herstelreden van 10 tot 500 tekens zijn verplicht.',
      );
    return this.store.transaction(() => {
      const row = this.row(id);
      if (row.state !== 'dead' || row.attempts !== attempts)
        throw new DomainError(
          'STATE',
          'Alleen de actuele mislukte analyse kan opnieuw worden klaargezet.',
        );
      this.store.db
        .prepare(
          "UPDATE inbox SET state='pending',attempts=0,available_at=?,lease_token=NULL,lease_until=NULL,last_error_code=NULL WHERE id=?",
        )
        .run(now, id);
      this.store.db
        .prepare('INSERT INTO operations_audit(target,actor,action,reason,at) VALUES(?,?,?,?,?)')
        .run(id, actor, 'analysis_requeued', reason, now);
      return this.receipt(id);
    });
  }
  stats(now: string) {
    const counts = this.store.db
      .prepare('SELECT state,count(*) count FROM inbox GROUP BY state')
      .all() as { state: State; count: number }[];
    const byState: Record<State, number> = {
      pending: 0,
      processing: 0,
      retry: 0,
      completed: 0,
      dead: 0,
    };
    for (const row of counts) byState[row.state] = Number(row.count);
    const oldest = this.store.db
      .prepare(
        "SELECT min(received_at) oldest FROM inbox WHERE state IN ('pending','processing','retry')",
      )
      .get() as { oldest: string | null };
    return {
      byState,
      oldestOutstandingSeconds: oldest.oldest
        ? Math.max(0, Math.floor((Date.parse(now) - Date.parse(oldest.oldest)) / 1000))
        : 0,
    };
  }
}
