import { createHash, randomUUID } from 'node:crypto';
import type { Store } from './store';
import { approve, deliver, DomainError, type Listing } from '../src/domain';
import { z } from 'zod';
const Receipt = z
  .object({ key: z.string(), bodyHash: z.string(), externalId: z.string() })
  .strict();
type Job = {
  id: string;
  lead_id: string;
  operation_key: string;
  body_hash: string;
  payload: string;
  state: string;
  attempts: number;
  available_at: string;
  lease_token: string | null;
  lease_until: string | null;
  receipt: string | null;
};
export async function dispatchConnector(
  store: Store,
  id: string,
  version: number,
  listings: Listing[],
  base: string,
  now: () => string,
  fetcher: typeof fetch = fetch,
) {
  const url = new URL(base);
  if (
    url.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new DomainError(
      'CONNECTOR_TARGET',
      'De portfolio-connector mag uitsluitend de lokale HTTP-testdienst bereiken.',
    );
  const lead = store.get(id);
  const existing = store.db
    .prepare('SELECT * FROM connector_jobs WHERE lead_id=? ORDER BY rowid DESC LIMIT 1')
    .get(id) as Job | undefined;
  if (existing?.state === 'confirmed')
    return { state: 'confirmed', receipt: JSON.parse(existing.receipt!), duplicate: true };
  if (lead.version !== version || lead.status !== 'queued')
    throw new DomainError(
      'STATE',
      'Alleen een actueel goedgekeurd dossier mag worden overgedragen.',
    );
  approve({ ...lead, status: 'review' }, version, 'connector-revalidation', listings, now());
  const listing = listings.find((p) => p.id === lead.extraction.reference);
  if (
    lead.extraction.intent === 'visit' &&
    (!listing ||
      listing.status !== 'available' ||
      Date.parse(now()) - Date.parse(listing.checkedAt) > 86400000)
  )
    throw new DomainError('CATALOG', 'Pandstatus is niet actueel beschikbaar.');
  const payload = JSON.stringify({
    id: lead.id,
    reference: lead.extraction.reference,
    task: 'Opvolgen fictieve aanvraag',
    draft: lead.draft,
  });
  const hash = createHash('sha256').update(payload).digest('hex');
  const key = `${id}:${lead.approvedAt}`;
  const token = randomUUID();
  const job = store.transaction(() => {
    store.db
      .prepare(
        "INSERT OR IGNORE INTO connector_jobs(id,lead_id,operation_key,body_hash,payload,state,available_at,updated_at) VALUES(?,?,?,?,?,'pending',?,?)",
      )
      .run(randomUUID(), id, key, hash, payload, now(), now());
    const row = store.db
      .prepare('SELECT * FROM connector_jobs WHERE operation_key=?')
      .get(key) as Job;
    if (row.body_hash !== hash)
      throw new DomainError(
        'CONNECTOR_CONFLICT',
        'De goedgekeurde inhoud is gewijzigd; herbeoordeling nodig.',
      );
    if (row.lease_until && row.lease_until > now())
      throw new DomainError('CONNECTOR_BUSY', 'Overdracht is al bezig.');
    if (row.available_at > now())
      throw new DomainError('CONNECTOR_WAIT', 'Wacht op het aangegeven retrymoment.');
    if (row.attempts >= 3 && row.state !== 'unknown')
      throw new DomainError(
        'CONNECTOR_DEAD',
        'Automatische pogingen zijn uitgeput; beheerherstel nodig.',
      );
    store.db
      .prepare(
        "UPDATE connector_jobs SET state='sending',attempts=attempts+1,lease_token=?,lease_until=?,updated_at=? WHERE id=?",
      )
      .run(token, new Date(Date.parse(now()) + 15000).toISOString(), now(), row.id);
    return row;
  });
  const update = (state: string, code: string | null, receipt?: unknown, waitMs = 0) =>
    store.transaction(() => {
      const changed = store.db
        .prepare(
          'UPDATE connector_jobs SET state=?,error_code=?,receipt=?,available_at=?,lease_token=NULL,lease_until=NULL,updated_at=? WHERE id=? AND lease_token=?',
        )
        .run(
          state,
          code,
          receipt ? JSON.stringify(receipt) : null,
          new Date(Date.parse(now()) + waitMs).toISOString(),
          now(),
          job.id,
          token,
        );
      if (!changed.changes)
        throw new DomainError('CONNECTOR_FENCED', 'Een andere worker beheert deze overdracht.');
      return {
        state,
        errorCode: code,
        receipt,
        availableAt: new Date(Date.parse(now()) + waitMs).toISOString(),
      };
    });
  try {
    // Always reconcile before POST. A prior timeout may have committed remotely.
    const lookup = await fetcher(`${url.origin}/records/${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(4000),
    });
    let receipt: unknown;
    if (lookup.ok) receipt = await lookup.json();
    else if (lookup.status !== 404)
      return update('retry', 'RECONCILE_UNAVAILABLE', undefined, 2000);
    else {
      if (job.attempts >= 3) return update('rejected', 'ATTEMPTS_EXHAUSTED');
      const response = await fetcher(`${url.origin}/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': key,
          'X-Body-Hash': hash,
        },
        body: payload,
        signal: AbortSignal.timeout(4000),
      });
      if (response.status === 429) {
        const seconds = Number(response.headers.get('retry-after'));
        return update(
          'retry',
          'RATE_LIMIT',
          undefined,
          Math.min(60000, Math.max(2000, Number.isFinite(seconds) ? seconds * 1000 : 2000)),
        );
      }
      if (response.status === 409) return update('rejected', 'REMOTE_CONFLICT');
      if (!response.ok) return update('unknown', 'REMOTE_OUTCOME_UNKNOWN');
      receipt = await response.json();
    }
    const confirmed = Receipt.parse(receipt);
    if (confirmed.key !== key || confirmed.bodyHash !== hash) throw Error('RECEIPT_MISMATCH');
    return store.transaction(() => {
      const current = store.get(id);
      if (current.version !== version || current.status !== 'queued')
        throw new DomainError('STALE', 'Dossier gewijzigd tijdens de overdracht.');
      const updated = store.db
        .prepare(
          "UPDATE connector_jobs SET state='confirmed',receipt=?,error_code=NULL,lease_token=NULL,lease_until=NULL,updated_at=? WHERE id=? AND lease_token=?",
        )
        .run(JSON.stringify(confirmed), now(), job.id, token);
      if (!updated.changes)
        throw new DomainError(
          'CONNECTOR_FENCED',
          'Overdracht is al door een andere worker verwerkt.',
        );
      const result = { state: 'confirmed', receipt: confirmed };
      store.save(deliver(current, false, now()));
      store.db.prepare("UPDATE outbox SET status='synced' WHERE id=?").run(id);
      store.db.prepare('INSERT OR IGNORE INTO receipts(id,at) VALUES(?,?)').run(id, now());
      return result;
    });
  } catch (error) {
    if (error instanceof DomainError) throw error;
    return update('unknown', 'REMOTE_OUTCOME_UNKNOWN');
  }
}
