import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../server/store';
import { makeServer, signature } from '../server/app';
import { extractOpenAI } from '../server/ai';
import { catalog } from '../src/seed';
const now = '2026-10-25T10:00:00.000Z';
const input = {
  eventId: 'evt-test',
  name: 'Robin Demo',
  email: 'robin@example.com',
  message: 'Graag DD-204 bezoeken op zaterdag.',
  channel: 'website',
};
test('database bewaart lead, goedkeuring, outbox en unieke CRM-ontvangst over herstart', () => {
  const dir = mkdtempSync(join(tmpdir(), 'estate-test-'));
  try {
    let s = new Store(join(dir, 'db.sqlite'));
    s.ingest(input, catalog(now), now);
    s.approve(input.eventId, 1, 'reviewer', catalog(now), now);
    s.close();
    s = new Store(join(dir, 'db.sqlite'));
    assert.equal(s.get(input.eventId).status, 'queued');
    assert.equal(s.dispatch(now).processed, 1);
    assert.equal(s.dispatch(now).processed, 0);
    assert.equal(s.stats().crmRecords, 1);
    assert.equal(s.stats().sentEmails, 0);
    s.close();
  } finally {
    rmSync(dir, { recursive: true });
  }
});
test('event idempotentie accepteert exact dezelfde payload en weigert andere inhoud', () => {
  const s = new Store();
  try {
    assert.equal(s.ingest(input, catalog(now), now).duplicate, false);
    assert.equal(s.ingest({ ...input }, catalog(now), now).duplicate, true);
    assert.throws(() =>
      s.ingest({ ...input, message: 'Graag een schatting van mijn woning.' }, catalog(now), now),
    );
    assert.equal(s.all().length, 1);
  } finally {
    s.close();
  }
});
test('mislukte outbox-insert rolt goedkeuring terug', () => {
  const s = new Store();
  try {
    s.ingest(input, catalog(now), now);
    s.db.exec(
      `CREATE TRIGGER fail_outbox BEFORE INSERT ON outbox BEGIN SELECT RAISE(ABORT, 'injected storage failure'); END;`,
    );
    assert.throws(() => s.approve(input.eventId, 1, 'reviewer', catalog(now), now));
    assert.equal(s.get(input.eventId).status, 'review');
    assert.equal(s.get(input.eventId).version, 1);
  } finally {
    s.close();
  }
});
test('HTTP: signed webhook, replay protection, auth, version conflict, dispatch', async () => {
  const s = new Store();
  const server = makeServer({
    store: s,
    credentials: [
      {
        token: 'local-test-token',
        subject: 'integration-reviewer',
        roles: ['reviewer', 'operator'],
      },
    ],
    webhookSecret: 'test-secret',
    listings: catalog(now),
    now: () => now,
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  const raw = JSON.stringify(input),
    timestamp = String(Date.parse(now) / 1000);
  const headers = {
    'Content-Type': 'application/json',
    'x-timestamp': timestamp,
    'x-signature': signature('test-secret', timestamp, raw),
  };
  try {
    assert.equal((await fetch(`${base}/api/leads`)).status, 401);
    assert.equal(
      (await fetch(`${base}/api/webhooks/leads`, { method: 'POST', body: raw })).status,
      401,
    );
    assert.equal(
      (
        await fetch(`${base}/api/webhooks/leads`, {
          method: 'POST',
          headers: { ...headers, 'x-timestamp': '1' },
          body: raw,
        })
      ).status,
      401,
    );
    assert.equal(
      (await fetch(`${base}/api/webhooks/leads`, { method: 'POST', headers, body: raw + ' ' }))
        .status,
      401,
    );
    assert.equal(
      (await fetch(`${base}/api/webhooks/leads`, { method: 'POST', headers, body: raw })).status,
      202,
    );
    assert.equal(
      (await fetch(`${base}/api/webhooks/leads`, { method: 'POST', headers, body: raw })).status,
      202,
    );
    const auth = { Authorization: 'Bearer local-test-token', 'Content-Type': 'application/json' };
    await fetch(`${base}/api/inbox/process`, { method: 'POST', headers: auth, body: '{}' });
    const url = `${base}/api/leads/evt-test/approve`;
    assert.equal(
      (await fetch(url, { method: 'POST', headers: auth, body: '{"version":2}' })).status,
      409,
    );
    assert.equal(
      (await fetch(url, { method: 'POST', headers: auth, body: '{"version":1,"actor":"admin"}' }))
        .status,
      400,
    );
    assert.equal(
      (await fetch(url, { method: 'POST', headers: auth, body: '{"version":1}' })).status,
      200,
    );
    assert.equal(
      (await fetch(url, { method: 'POST', headers: auth, body: '{"version":1}' })).status,
      409,
    );
    assert.equal(
      (await fetch(`${base}/api/outbox/dispatch`, { method: 'POST', headers: auth, body: '{}' }))
        .status,
      200,
    );
    assert.equal(s.stats().crmRecords, 1);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    s.close();
  }
});
test('AI transport: structured output, store:false, no tools, and bounded schema', async () => {
  let sent: Record<string, unknown> = {};
  const fake = (async (_url: unknown, options: RequestInit) => {
    sent = JSON.parse(String(options.body));
    return new Response(
      JSON.stringify({
        status: 'completed',
        output: [
          {
            content: [
              {
                type: 'output_text',
                text: JSON.stringify({
                  intent: 'visit',
                  reference: 'DD-204',
                  evidence: 'bezoeken',
                }),
              },
            ],
          },
        ],
      }),
      { status: 200 },
    );
  }) as typeof fetch;
  const result = await extractOpenAI(input as never, 'test-key', 'test-model', fake);
  assert.equal(result.intent, 'visit');
  assert.equal(sent.store, false);
  assert.equal(sent.tools, undefined);
  assert.equal(sent.max_output_tokens, 500);
  assert.equal(JSON.stringify(sent.input).includes(input.email), false);
  assert.equal(JSON.stringify(sent.input).includes(input.name), false);
});
test('AI refuses, HTTP failures, incomplete and hallucinated output are rejected', async () => {
  for (const response of [
    new Response('{}', { status: 429 }),
    new Response(JSON.stringify({ status: 'incomplete' })),
    new Response(
      JSON.stringify({ status: 'completed', output: [{ content: [{ type: 'refusal' }] }] }),
    ),
    new Response(
      JSON.stringify({
        status: 'completed',
        output: [
          {
            content: [
              {
                type: 'output_text',
                text: '{"intent":"visit","reference":"DD-999","evidence":"bezoeken"}',
              },
            ],
          },
        ],
      }),
    ),
  ])
    await assert.rejects(() =>
      extractOpenAI(
        input as never,
        'test-key',
        'test-model',
        (async () => response) as typeof fetch,
      ),
    );
});
