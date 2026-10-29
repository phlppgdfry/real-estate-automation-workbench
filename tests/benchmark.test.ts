import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import YAML from 'yaml';

test('benchmark executes identical NL/FR, empty and sold criteria locally; default cannot issue cloud calls', () => {
  execFileSync(process.execPath, ['--import', 'tsx', 'scripts/benchmark.ts'], {
    stdio: 'pipe',
    env: { ...process.env, HTTP_PROXY: 'http://127.0.0.1:1', HTTPS_PROXY: 'http://127.0.0.1:1' },
  });
  const report = JSON.parse(readFileSync('var/benchmark.json', 'utf8'));
  assert.equal(report.status, 'local-passed-cloud-not-run');
  assert.equal(report.results.filter((r: { status: string }) => r.status === 'passed').length, 8);
  assert.equal(report.results.filter((r: { status: string }) => r.status === 'not-run').length, 8);
  for (const r of report.results.filter((r: { status: string }) => r.status === 'passed')) {
    assert.ok(!r.references.includes('DD-209'));
    if (r.caseId === 'empty-city') assert.deepEqual(r.references, []);
    if (r.caseId.endsWith('matches')) assert.deepEqual(r.references, ['DD-212', 'DD-204']);
  }
  const dsl = YAML.parse(readFileSync('dify/benchmarks/fixed-comparison.yml', 'utf8'));
  assert.deepEqual(
    dsl.workflow.graph.nodes.map((n: { data: { type: string } }) => n.data.type),
    ['start', 'code', 'code', 'end'],
  );
});
