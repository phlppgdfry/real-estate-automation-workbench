import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import YAML from 'yaml';
import { Store } from '../server/store';
import { makeServer } from '../server/app';
import { catalog } from '../src/seed';
import { once } from 'node:events';

test('native schedule DSL is model-free and its exact Python produces stable daily replay keys', () => {
  const d = YAML.parse(readFileSync('dify/apps/follow-up-trigger.yml', 'utf8'));
  const nodes = d.workflow.graph.nodes.filter((n: { type: string }) => n.type !== 'custom-note');
  assert.deepEqual(
    nodes.map((n: { data: { type: string } }) => n.data.type),
    ['trigger-schedule', 'code', 'end'],
  );
  assert.equal(nodes[0].data.cron_expression, '0 9 * * 1-5');
  assert.equal(nodes[0].data.timezone, 'Europe/Brussels');
  assert.equal(nodes[1].data.code, readFileSync('dify/code/prepare_followup.py', 'utf8'));
  const code = nodes[1].data.code;
  const run = (timestamp: unknown) =>
    JSON.parse(
      execFileSync(
        'python3',
        ['-c', code + '\nimport sys\nprint(main(json.load(sys.stdin))["result"])'],
        { input: JSON.stringify(timestamp), encoding: 'utf8', stdio: 'pipe' },
      ),
    );
  const event = JSON.parse(readFileSync('data/trigger/native-event.json', 'utf8'));
  assert.deepEqual(run(1793260620), event);
  assert.deepEqual(run(1793260680), event);
  for (const invalid of [true, null, -1, '1793260620']) assert.throws(() => run(invalid));
});

test('recorded native event replays through the real CLI and persists one receipt', async () => {
  const store = new Store();
  const server = makeServer({
    store,
    listings: catalog(),
    credentials: [{ token: 'test-operator', subject: 'test', roles: ['operator'] }],
    webhookSecret: 'test',
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const { spawn } = await import('node:child_process');
    const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/trigger-replay.ts'], {
      env: {
        ...process.env,
        OPERATOR_TOKEN: 'test-operator',
        LAB_API_URL: `http://127.0.0.1:${(server.address() as { port: number }).port}`,
      },
      stdio: 'pipe',
    });
    let error = '';
    child.stderr.on('data', (chunk) => {
      error += chunk;
    });
    const [code] = await once(child, 'exit');
    assert.equal(code, 0, error);
    assert.equal(
      (store.db.prepare('SELECT count(*) count FROM workflow_events').get() as { count: number })
        .count,
      1,
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    store.close();
  }
});
