import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import YAML from 'yaml';
import procedures from '../data/knowledge/procedures.json' with { type: 'json' };
const doc = YAML.parse(readFileSync('dify/apps/operations-assistant.yml', 'utf8'));
const graph = doc.workflow.graph;
const code = graph.nodes.find((n: { id: string }) => n.id === 'knowledge-guard').data.code;
function run(records: unknown[], language: string) {
  return JSON.parse(
    execFileSync(
      'python3',
      ['-c', code + '\nimport sys\np=json.load(sys.stdin)\nprint(main(**p)["result"])'],
      {
        input: JSON.stringify({ records, language }),
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf8',
      },
    ),
  );
}
const record = (id: string) => {
  const p = procedures.find((p) => p.id === id)!;
  return { metadata: { document_name: id + '.md' }, content: '# ' + p.title + '\n\n' + p.text };
};
test('native Knowledge guard accepts exact current NL/FR procedures, deduplicates, abstains and rejects invalid sources', () => {
  for (const p of procedures.filter((p) => p.state === 'current')) {
    const result = run([record(p.id), record(p.id)], p.language);
    assert.deepEqual(result.facts, [{ source_id: p.id, quote: p.text }]);
    assert.equal(result.requires_human, true);
  }
  assert.deepEqual(run([], 'fr').facts, []);
  assert.match(run([], 'fr').summary, /Aucune/);
  for (const [records, language] of [
    [[record('SOP-VISIT-NL-1')], 'nl'],
    [[record('SOP-VISIT-FR-1')], 'nl'],
    [
      [{ ...record('SOP-VISIT-NL-2'), content: 'Verkochte panden mogen toch worden ingepland.' }],
      'nl',
    ],
    [[{ content: 'Geen herkomst.' }], 'nl'],
    [[], 'de'],
  ] as const)
    assert.throws(() => run([...records], language));
});
test('native procedure branch has metadata filters and no path to an LLM or write tool, including failure', () => {
  const knowledge = graph.nodes.find((n: { id: string }) => n.id === 'knowledge');
  assert.equal(knowledge.data.metadata_filtering_mode, 'manual');
  assert.equal(knowledge.data.multiple_retrieval_config.reranking_enable, false);
  assert.deepEqual(
    knowledge.data.metadata_filtering_conditions.conditions.map(
      (c: { name: string; value: string }) => [c.name, c.value],
    ),
    [
      ['state', 'current'],
      ['language', '{{#procedure-language.language#}}'],
    ],
  );
  const pending = ['procedure-language'],
    seen = new Set<string>();
  while (pending.length) {
    const id = pending.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const node = graph.nodes.find((n: { id: string }) => n.id === id);
    assert.ok(['knowledge-retrieval', 'code', 'answer'].includes(node.data.type));
    pending.push(
      ...graph.edges
        .filter((e: { source: string }) => e.source === id)
        .map((e: { target: string }) => e.target),
    );
  }
  assert.ok(seen.has('procedure-answer') && seen.has('knowledge-error'));
  assert.ok(!seen.has('explain'));
});

test('native procedure language has an explicit NL default and rejects unsupported languages', () => {
  const code = graph.nodes.find((n: { id: string }) => n.id === 'procedure-language').data.code;
  const run = (language: unknown) =>
    JSON.parse(
      execFileSync(
        'python3',
        ['-c', code + '\nimport sys,json\nprint(json.dumps(main(json.load(sys.stdin))))'],
        { input: JSON.stringify(language), stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8' },
      ),
    );
  for (const language of [null, '', 'nl']) assert.deepEqual(run(language), { language: 'nl' });
  assert.deepEqual(run('fr'), { language: 'fr' });
  assert.throws(() => run('de'));
});
