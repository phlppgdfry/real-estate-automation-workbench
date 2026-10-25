import { writeFileSync, mkdirSync } from 'node:fs';
import fixtures from '../data/evaluation.json';
import { createLead } from '../src/domain';
import { catalog } from '../src/seed';
const now = '2026-10-25T10:00:00.000Z';
const results = fixtures.map((x) => {
  const l = createLead(
    {
      eventId: x.id,
      name: 'Test Demo',
      email: 'test@example.com',
      message: x.message,
      channel: 'website',
    },
    catalog(now),
    now,
  );
  return {
    id: x.id,
    expectedIntent: x.intent,
    actualIntent: l.extraction.intent,
    expectedStatus: x.status,
    actualStatus: l.status,
    pass: l.extraction.intent === x.intent && l.status === x.status,
  };
});
const failed = results.filter((x) => !x.pass);
mkdirSync('var', { recursive: true });
writeFileSync(
  'var/evaluation-results.json',
  JSON.stringify(
    {
      provider: 'deterministic-rules',
      total: results.length,
      passed: results.length - failed.length,
      failures: failed,
      results,
    },
    null,
    2,
  ),
);
console.log(
  `Regelbaseline: ${results.length - failed.length}/${results.length} voorbeelden correct.`,
);
for (const x of failed)
  console.log(
    `BEKENDE BEPERKING ${x.id}: ${x.actualIntent}/${x.actualStatus}; verwacht ${x.expectedIntent}/${x.expectedStatus}`,
  );
// Pin the known baseline, including its failures. Improvements require an intentional update.
const expectedFailures: string[] = [];
if (JSON.stringify(failed.map((x) => x.id).sort()) !== JSON.stringify(expectedFailures.sort()))
  process.exitCode = 1;
