import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import YAML from 'yaml';
import { ComparisonInputSchema, validateComparison } from '../src/comparison-contract';
import { compareDify } from '../server/dify-services';
const proof = JSON.parse(readFileSync('data/agent/workflow-preview.json', 'utf8'));
const input = ComparisonInputSchema.parse(proof.input);
const fixture = proof.result.comparison;
function python(value: unknown) {
  return JSON.parse(
    execFileSync(
      'python3',
      [
        '-c',
        `import json,sys,runpy
m=runpy.run_path('dify/code/validate_comparison.py')
a=json.load(sys.stdin)
print(m['main'](json.dumps(a), 'Oudenburg', 390000, 3)['result'])`,
      ],
      { input: JSON.stringify(value), stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8' },
    ),
  );
}
test('real native Agent workflow result passes both independent guards', () => {
  assert.deepEqual(validateComparison(fixture, input), fixture);
  assert.deepEqual(python(fixture), fixture);
});
test('guards reject altered prices, sources, sold suggestions, relaxed criteria, missing matches and unsafe gates', () => {
  const mutations = [
    (v: any) => {
      v.comparisons[0].price = 1;
    },
    (v: any) => {
      v.comparisons[0].source_id = 'catalog:fake';
    },
    (v: any) => {
      v.suggested_references.push('DD-209');
    },
    (v: any) => {
      v.criteria.min_bedrooms = 2;
    },
    (v: any) => {
      v.suggested_references.pop();
    },
    (v: any) => {
      v.requires_human = false;
    },
    (v: any) => {
      v.excluded[0].reasons = ['invented prose'];
    },
    (v: any) => {
      v.comparisons[0].price = true;
    },
    (v: any) => {
      v.comparisons.push(v.comparisons[0]);
    },
    (v: any) => {
      v.excluded.push({ reference: 'DD-204', reasons: ['sold'] });
    },
  ];
  for (const mutate of mutations) {
    const v = structuredClone(fixture);
    mutate(v);
    assert.throws(() => validateComparison(v, input));
    assert.throws(() => python(v));
  }
});
test('catalogue skill filters deterministically and never recommends sold property; named comparison can inspect one', () => {
  const script = 'dify/agent/skills/catalog-compare/scripts/query_catalog.py';
  const run = (args: string[]) =>
    JSON.parse(execFileSync('python3', [script, ...args], { encoding: 'utf8' }));
  assert.deepEqual(
    run(['--city', 'Oudenburg', '--max-price', '390000', '--min-bedrooms', '3']).matches.map(
      (p: any) => p.id,
    ),
    ['DD-212', 'DD-204'],
  );
  assert.deepEqual(run(['--city', 'Oostende']).matches, []);
  assert.equal(run(['--references', 'DD-209']).matches[0].status, 'sold');
  assert.deepEqual(run(['--max-price', '1']).matches, []);
  assert.throws(() =>
    execFileSync('python3', [script, '--references', 'DD-999'], { stdio: 'pipe' }),
  );
});
test('comparison service sends explicit criteria and revalidates upstream rather than trusting workflow success', async () => {
  let request: any;
  const fetcher: typeof fetch = async (_url, options) => {
    request = JSON.parse(String(options?.body));
    return new Response(
      JSON.stringify({
        data: {
          status: 'succeeded',
          outputs: { result: JSON.stringify(fixture) },
          total_tokens: 111,
        },
      }),
    );
  };
  const result = await compareDify(input, { apiKey: 'test' }, fetcher);
  assert.deepEqual(result.comparison, fixture);
  assert.equal(request.inputs.max_price, 390000);
  assert.equal(request.inputs.min_bedrooms, 3);
  await assert.rejects(
    compareDify(
      input,
      { apiKey: 'test' },
      async () =>
        new Response(
          JSON.stringify({
            data: {
              status: 'succeeded',
              outputs: { result: JSON.stringify({ ...fixture, requires_human: false }) },
            },
          }),
        ),
    ),
  );
  for (const bad of [
    { ...input, maxPrice: NaN },
    { ...input, minBedrooms: 2.5 },
    { ...input, maxPrice: true },
  ])
    assert.equal(ComparisonInputSchema.safeParse(bad).success, false);
});
test('native workflow contains a connected Agent v2 and the exact tested Python guard', () => {
  for (const file of ['dify/apps/agent-comparison.yml', 'dify/agent/live-workflow-export.yml']) {
    const d = YAML.parse(readFileSync(file, 'utf8'));
    const nodes = d.workflow.graph.nodes;
    const agent = nodes.find((n: any) => n.data.version === '2');
    assert.equal(agent.data.agent_node_kind, 'dify_agent');
    assert.equal(agent.data.agent_binding.binding_type, 'roster_agent');
    assert.ok(
      d.workflow.graph.edges.some((e: any) => e.source === 'start' && e.target === agent.id),
    );
    assert.ok(
      d.workflow.graph.edges.some((e: any) => e.source === agent.id && e.target === 'validate'),
    );
    assert.equal(
      nodes.find((n: any) => n.id === 'validate').data.code,
      readFileSync('dify/code/validate_comparison.py', 'utf8'),
    );
    assert.ok(agent.data.agent_task.includes('sold, city, price, bedrooms'));
  }
});
