import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../server/store';
import { Inbox } from '../server/inbox';
import { processInbox } from '../server/analysis-worker';
import { catalog } from '../src/seed';
const dir = mkdtempSync(join(tmpdir(), 'estate-drill-'));
let store = new Store(join(dir, 'db'));
const start = '2026-10-25T10:00:00.000Z';
let now = start;
const trace: { step: string; result: string }[] = [];
const record = (step: string, result: string) => {
  trace.push({ step, result });
  console.log(`${step}: ${result}`);
};
try {
  let inbox = new Inbox(store);
  const input = {
    eventId: 'drill-001',
    name: 'Drill Demo',
    email: 'drill@example.com',
    message: 'Graag DD-204 bezoeken deze week.',
    channel: 'website',
  };
  assert.equal(inbox.accept(input, now).state, 'pending');
  assert.equal(inbox.accept(input, now).duplicate, true);
  record('Ontvangst', 'Duurzaam opgeslagen; dubbele levering blijft één event.');
  await processInbox(
    inbox,
    catalog(start),
    () => now,
    async () => {
      throw new Error('injected outage');
    },
  );
  assert.equal(inbox.receipt(input.eventId).state, 'retry');
  record('AI-storing', 'Aanvraag bewaard; analyse wacht op retry.');
  store.close();
  store = new Store(join(dir, 'db'));
  inbox = new Inbox(store);
  now = '2026-10-25T10:00:02.000Z';
  await processInbox(inbox, catalog(start), () => now);
  assert.equal(store.get(input.eventId).status, 'review');
  record('Herstart', 'Werk hervat uit dezelfde database, zonder nieuwe intake.');
  store.approve(input.eventId, 1, 'drill-reviewer', catalog(start), now);
  store.dispatch(now, true);
  now = '2026-10-25T10:00:04.000Z';
  store.dispatch(now, true);
  now = '2026-10-25T10:00:08.000Z';
  store.dispatch(now, true);
  const dead = store.get(input.eventId);
  assert.equal(dead.status, 'dead');
  record('CRM-storing', 'Na drie pogingen gestopt; geen ontvangst geclaimd.');
  const sold = catalog(start);
  sold[0].status = 'sold';
  assert.throws(() =>
    store.requeue(
      dead.id,
      dead.version,
      'drill-operator',
      'CRM hersteld en externe sleutel gecontroleerd.',
      sold,
      now,
    ),
  );
  record('Bron opnieuw toetsen', 'Herstel met verkocht pand wordt geweigerd.');
  store.requeue(
    dead.id,
    dead.version,
    'drill-operator',
    'CRM hersteld en externe sleutel gecontroleerd.',
    catalog(start),
    now,
  );
  store.dispatch(now);
  store.dispatch(now);
  assert.equal(store.stats().crmRecords, 1);
  assert.equal(store.get(dead.id).audit.filter((a) => a.action === 'crm_failed').length, 3);
  record(
    'Gecontroleerd herstel',
    'Eén CRM-mockrecord; vorige fouten en herstelreden blijven zichtbaar.',
  );
  mkdirSync('var', { recursive: true });
  writeFileSync(
    'var/failure-drill.json',
    JSON.stringify(
      {
        scenario: 'provider outage → restart → CRM outage → controlled recovery',
        crmRecords: store.stats().crmRecords,
        sentEmails: 0,
        trace,
      },
      null,
      2,
    ),
  );
} finally {
  store.close();
  rmSync(dir, { recursive: true });
}
