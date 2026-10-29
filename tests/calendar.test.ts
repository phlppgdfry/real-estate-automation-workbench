import { test } from 'node:test';
import assert from 'node:assert/strict';
import { brusselsDayWindow } from '../server/calendar';
import { Store } from '../server/store';
import { RunLedger } from '../server/run-ledger';

test('daily budget follows Brussels midnight and 23/25-hour DST days', () => {
  for (const [instant, hours] of [
    ['2026-03-29T12:00:00Z', 23],
    ['2026-10-25T12:00:00Z', 25],
  ] as const) {
    const day = brusselsDayWindow(instant);
    assert.equal((Date.parse(day.end) - Date.parse(day.start)) / 3600000, hours);
  }
  assert.deepEqual(brusselsDayWindow('2026-10-28T23:30:00Z'), {
    start: '2026-10-28T23:00:00.000Z',
    end: '2026-10-29T23:00:00.000Z',
  });
  const store = new Store();
  try {
    const ledger = new RunLedger(store, { dailyTokens: 100, reservationTokens: 100 });
    ledger.start('document', 'test', null, 'test', '2026-10-28T22:59:59.000Z');
    assert.equal(ledger.usage('2026-10-28T23:00:00.000Z').chargedTokens, 0);
    ledger.start('document', 'test', null, 'test', '2026-10-28T23:00:00.000Z');
    assert.equal(ledger.usage('2026-10-29T12:00:00.000Z').chargedTokens, 100);
    assert.throws(() => ledger.start('document', 'test', null, 'test', '2026-10-29T12:00:00.000Z'));
    assert.equal(ledger.usage('2026-10-29T23:00:00.000Z').chargedTokens, 0);
  } finally {
    store.close();
  }
});
