import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../server/store';
import { RunLedger } from '../server/run-ledger';
import { dispatchConnector } from '../server/crm-connector';
import { crmTestService } from '../server/crm-test-service';
import { makeServer } from '../server/app';
import { catalog } from '../src/seed';
import { extractDocument } from '../server/document-extract';
import { retrieveProcedures } from '../server/knowledge';
const time = '2026-10-27T12:00:00.000Z';
const input = {
  eventId: 'connected-001',
  name: 'Robin Demo',
  email: 'robin@example.com',
  channel: 'website' as const,
  message: 'Ik wil DD-204 bezoeken.',
};
test('budget reservations are atomic, count unknown usage conservatively and persist safe failures', () => {
  const store = new Store();
  try {
    const runs = new RunLedger(store, { dailyTokens: 100, reservationTokens: 50 });
    const one = runs.start('document', 'reviewer', null, 'test', time);
    const two = runs.start('compare', 'reviewer', null, 'test', time);
    assert.throws(() => runs.start('compare', 'reviewer', null, 'test', time), /budget/);
    runs.finish(one, 'succeeded', time, { run: { totalTokens: 10 } });
    runs.finish(two, 'failed', time, undefined, 'PROVIDER_REJECTED');
    assert.equal(runs.usage(time).chargedTokens, 60);
    assert.equal(runs.usage(time).actualTokens, 10);
    assert.throws(() => runs.finish(one, 'failed', time), /afgerond/);
    assert.doesNotMatch(JSON.stringify(runs.list()), /robin@example/);
    assert.throws(() => new RunLedger(store, { dailyTokens: NaN, reservationTokens: 50 }));
  } finally {
    store.close();
  }
});
test('HTTP CRM commit-disconnect is reconciled after restart with one remote record and durable receipt', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'workbench-restart-'));
  let store = new Store(join(dir, 'local.sqlite'));
  const remote = crmTestService();
  remote.server.listen(0, '127.0.0.1');
  await once(remote.server, 'listening');
  const base = `http://127.0.0.1:${(remote.server.address() as { port: number }).port}`;
  try {
    const lead = store.ingest(input, catalog(time), time).lead;
    const approved = store.approve(lead.id, lead.version, 'reviewer', catalog(time), time);
    remote.setFault('commit-disconnect');
    const first = await dispatchConnector(
      store,
      lead.id,
      approved.version,
      catalog(time),
      base,
      () => time,
    );
    assert.equal(first.state, 'unknown');
    assert.equal(store.get(lead.id).status, 'queued');
    store.close();
    store = new Store(join(dir, 'local.sqlite'));
    const second = await dispatchConnector(
      store,
      lead.id,
      approved.version,
      catalog(time),
      base,
      () => time,
    );
    assert.equal(second.state, 'confirmed');
    assert.equal(store.get(lead.id).status, 'synced');
    assert.equal((await (await fetch(base + '/health')).json()).records, 1);
    const duplicate = await dispatchConnector(
      store,
      lead.id,
      approved.version,
      catalog(time),
      base,
      () => time,
    );
    assert.ok('duplicate' in duplicate && duplicate.duplicate === true);
    assert.equal((await (await fetch(base + '/health')).json()).records, 1);
  } finally {
    remote.server.close();
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test('configured cost ceiling rounds conservatively and blocks a reservation before provider work', () => {
  const store = new Store();
  try {
    const runs = new RunLedger(store, {
      dailyTokens: 1000,
      reservationTokens: 100,
      totalTokenPriceCapMicrosPerMillion: 1000001,
      dailyCostCapMicros: 201,
    });
    const id = runs.start('document', 'reviewer', null, 'test', time);
    assert.equal(runs.usage(time).budgetedCostMicros, 101);
    assert.throws(() => runs.start('document', 'reviewer', null, 'test', time), /kostenplafond/);
    runs.finish(id, 'succeeded', time, { run: { totalTokens: 1 } });
    assert.equal(runs.usage(time).budgetedCostMicros, 2);
    assert.ok(runs.start('document', 'reviewer', null, 'test', time));
    assert.throws(
      () =>
        new RunLedger(store, { dailyTokens: 100, reservationTokens: 50, dailyCostCapMicros: 100 }),
    );
    assert.throws(
      () =>
        new RunLedger(store, { dailyTokens: Number.MAX_SAFE_INTEGER + 1, reservationTokens: 50 }),
    );
  } finally {
    store.close();
  }
});
test('HTTP CRM rate limits schedule retries and changed catalog prevents network writes', async () => {
  const store = new Store();
  const remote = crmTestService();
  remote.server.listen(0, '127.0.0.1');
  await once(remote.server, 'listening');
  const base = `http://127.0.0.1:${(remote.server.address() as { port: number }).port}`;
  let now = time;
  try {
    const lead = store.ingest(input, catalog(time), time).lead;
    const approved = store.approve(lead.id, lead.version, 'reviewer', catalog(time), time);
    remote.setFault('rate-limit');
    const result = await dispatchConnector(
      store,
      lead.id,
      approved.version,
      catalog(time),
      base,
      () => now,
    );
    assert.equal(result.state, 'retry');
    await assert.rejects(
      dispatchConnector(store, lead.id, approved.version, catalog(time), base, () => now),
      /retrymoment/,
    );
    now = '2026-10-27T12:00:03.000Z';
    const changed = catalog(time).map((p) =>
      p.id === 'DD-204' ? { ...p, price: p.price + 1 } : p,
    );
    await assert.rejects(
      dispatchConnector(store, lead.id, approved.version, changed, base, () => now),
      /Brongegevens/,
    );
    assert.equal((await (await fetch(base + '/health')).json()).records, 0);
    assert.equal(
      (await dispatchConnector(store, lead.id, approved.version, catalog(time), base, () => now))
        .state,
      'confirmed',
    );
  } finally {
    remote.server.close();
    store.close();
  }
});
test('document parsing redacts contact details, rejects unsupported files and extracts email body without attachments', async () => {
  const result = await extractDocument(
    'fiche.txt',
    Buffer.from('Referentie: DD-204\nGemeente: Oudenburg\nContact: private@example.com'),
  );
  assert.equal(result.state, 'extracted');
  assert.doesNotMatch(result.source, /private@example/);
  assert.match(result.source, /\[EMAIL\]/);
  await assert.rejects(extractDocument('../bad.exe', Buffer.from('text')), /TYPE/);
  const mail = Buffer.from(
    'MIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nReferentie: DD-204\r\nVraagprijs: 389000 EUR\r\nGemeente: Oudenburg',
  );
  const eml = await extractDocument('aanvraag.eml', mail);
  assert.match(eml.source, /389000/);
});
test('knowledge lookup filters language and superseded procedures; unknown questions abstain', () => {
  const result = retrieveProcedures('Wat doen we bij een verkocht pand en een bezoek?', 'nl');
  assert.ok(result.sources.length);
  assert.ok(
    result.sources.every((s) => s.source_id !== 'SOP-VISIT-NL-1' && !s.source_id.includes('-FR-')),
  );
  assert.equal(retrieveProcedures('astronomie zwarte gaten', 'nl').sources.length, 0);
});
test('connected API separates read/review/operate, persists intake and deduplicates scheduled events', async () => {
  const store = new Store();
  const server = makeServer({
    store,
    credentials: [
      { token: 'read', subject: 'r', roles: ['reader'] },
      { token: 'review', subject: 'v', roles: ['reviewer'] },
      { token: 'operate', subject: 'o', roles: ['operator'] },
    ],
    listings: catalog(time),
    webhookSecret: 'test',
    now: () => time,
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const post = (path: string, token: string, body: unknown) =>
    fetch(base + path, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  try {
    assert.equal((await post('/api/workspace/intake', 'read', input)).status, 403);
    assert.equal((await post('/api/workspace/intake', 'review', input)).status, 202);
    assert.equal((await post('/api/inbox/process', 'review', { limit: 1 })).status, 403);
    assert.equal((await post('/api/inbox/process', 'operate', { limit: 1 })).status, 200);
    const snapshot = await (
      await fetch(base + '/api/workspace', { headers: { Authorization: 'Bearer read' } })
    ).json();
    assert.equal(snapshot.leads.length, 1);
    assert.equal(snapshot.inbox[0].state, 'completed');
    const trigger = { eventId: 'daily-2026-10-27', kind: 'schedule' };
    assert.equal((await post('/api/workspace/digest/trigger', 'review', trigger)).status, 403);
    assert.equal((await post('/api/workspace/digest/trigger', 'operate', trigger)).status, 200);
    assert.equal(
      (await (await post('/api/workspace/digest/trigger', 'operate', trigger)).json()).duplicate,
      true,
    );
    assert.equal(
      (await post('/api/workspace/digest/trigger', 'operate', { ...trigger, kind: 'integration' }))
        .status,
      409,
    );
  } finally {
    server.close();
    store.close();
  }
});
test('document review corrections require exact source evidence, preserve case approval and recover expired reviews', async () => {
  const store = new Store();
  const lead = store.ingest(input, catalog(time), time).lead;
  const server = makeServer({
    store,
    credentials: [
      { token: 'review', subject: 'reviewer', roles: ['reviewer'] },
      { token: 'read', subject: 'reader', roles: ['reader'] },
    ],
    listings: catalog(time),
    webhookSecret: 'test',
    now: () => time,
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const request = (path: string, body?: unknown, token = 'review') =>
    fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const source = 'Referentie: DD-204\nGemeente: Oudenburg\nVraagprijs: 389000 EUR';
  const upload = {
    leadId: lead.id,
    filename: 'fiche.txt',
    base64: Buffer.from(source).toString('base64'),
  };
  try {
    const created = await request('/api/workspace/documents', upload);
    assert.equal(created.status, 201);
    const document = await created.json();
    assert.equal(
      (await (await request('/api/workspace/documents', upload)).json()).duplicate,
      true,
    );
    store.db
      .prepare("UPDATE workspace_documents SET state='needs_ocr' WHERE id=?")
      .run(document.id);
    assert.equal(
      (await (await request('/api/workspace/documents', { ...upload, ocr: true })).json()).state,
      'extracted',
    );
    const proposal = {
      document_type: 'property-sheet',
      facts: [{ field: 'reference', value: 'DD-204', quote: 'Referentie: DD-204' }],
      missing_fields: ['price', 'city', 'status'],
      risks: [],
      requires_human: true,
    };
    store.db
      .prepare(
        "INSERT INTO content_reviews(id,document_id,state,proposed,created_at,expires_at) VALUES('review-1',?,'pending',?,?,?)",
      )
      .run(document.id, JSON.stringify(proposal), time, '2026-10-28T12:00:00Z');
    store.db
      .prepare("UPDATE workspace_documents SET state='awaiting_review' WHERE id=?")
      .run(document.id);
    const corrected = {
      ...proposal,
      facts: [
        ...proposal.facts,
        { field: 'city', value: 'Oudenburg', quote: 'Gemeente: Oudenburg' },
      ],
      missing_fields: ['price', 'status'],
    };
    assert.equal(
      (
        await request(
          '/api/workspace/reviews/review-1',
          { version: 1, action: 'approve', comment: 'Nagekeken.', corrected },
          'read',
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await request('/api/workspace/reviews/review-1', {
          version: 1,
          action: 'approve',
          comment: 'Nagekeken.',
          corrected: {
            ...corrected,
            facts: [{ field: 'price', value: '1', quote: 'Verzonnen prijs: 1' }],
          },
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await request('/api/workspace/reviews/review-1', {
          version: 1,
          action: 'approve',
          comment: 'Gemeente gecontroleerd.',
          corrected,
        })
      ).status,
      200,
    );
    assert.equal(store.get(lead.id).status, lead.status);
    assert.equal(
      (
        await request('/api/workspace/reviews/review-1', {
          version: 1,
          action: 'reject',
          comment: 'Te laat.',
        })
      ).status,
      409,
    );
    store.db
      .prepare(
        "UPDATE content_reviews SET state='pending',expires_at='2026-10-26T12:00:00Z',form_token='private-form-token'",
      )
      .run();
    store.db.prepare("UPDATE workspace_documents SET state='awaiting_review'").run();
    const snapshot = await (await request('/api/workspace', undefined, 'read')).json();
    assert.equal(snapshot.documents[0].state, 'extracted');
    assert.equal(snapshot.reviews[0].state, 'expired');
    assert.doesNotMatch(JSON.stringify(snapshot), /private-form-token/);
    assert.doesNotMatch(
      JSON.stringify(await (await request('/api/workspace/traces', undefined, 'read')).json()),
      /Referentie|private-form-token/,
    );
    assert.equal(
      (
        await request('/api/workspace/documents', {
          ...upload,
          filename: 'bad.pdf',
          base64: Buffer.from('This is not a PDF document.').toString('base64'),
        })
      ).status,
      422,
    );
  } finally {
    server.close();
    store.close();
  }
});
