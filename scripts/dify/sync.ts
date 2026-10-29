import { readFileSync, writeFileSync } from 'node:fs';
import YAML from 'yaml';
import { annotateCanvas, type CanvasGuide } from './canvas';
const guide = JSON.parse(readFileSync('dify/canvas/guide.json', 'utf8'));
const apps = [
  { file: 'follow-up-trigger', prompt: null, code: { event: 'prepare_followup' } },
  { file: 'agent-comparison', prompt: null, code: { validate: 'validate_comparison' } },
  { file: 'lead-intake', prompt: 'lead-system', code: { validate: 'validate_lead' } },
  {
    file: 'operations-assistant',
    prompt: 'assistant-system',
    code: {
      prepare: 'prepare_context',
      validate: 'validate_assistant',
      'knowledge-guard': 'validate_knowledge',
      'procedure-language': 'select_procedure_language',
    },
  },
  {
    file: 'document-review',
    prompt: 'document-system',
    code: { redact: 'redact_document', validate: 'validate_document' },
  },
];
for (const app of apps) {
  const path = `dify/apps/${app.file}.yml`,
    doc = YAML.parse(readFileSync(path, 'utf8'));
  for (const node of doc.workflow.graph.nodes) {
    if (node.data.type === 'code') {
      const file = app.code[node.id as keyof typeof app.code];
      if (!file) throw new Error(`Unknown code node ${node.id}`);
      node.data.code = readFileSync(`dify/code/${file}.py`, 'utf8').replace(
        '__PROCEDURES_JSON__',
        JSON.stringify(JSON.parse(readFileSync('data/knowledge/procedures.json', 'utf8'))),
      );
    }
    if (node.data.type === 'llm') {
      node.data.prompt_template.find((p: { role: string }) => p.role === 'system').text =
        readFileSync(`dify/prompts/${app.prompt}.txt`, 'utf8');
      node.data.structured_output_enabled = true;
      node.data.structured_output = {
        schema: JSON.parse(readFileSync(`dify/schemas/${app.file}.json`, 'utf8')),
      };
    }
  }
  if (!['agent-comparison', 'follow-up-trigger'].includes(app.file))
    annotateCanvas(
      doc,
      guide.apps.find((g: CanvasGuide) => g.id === app.file),
    );
  const next = YAML.stringify(doc, { lineWidth: 0 });
  if (process.argv.includes('--check')) {
    if (YAML.stringify(YAML.parse(readFileSync(path, 'utf8')), { lineWidth: 0 }) !== next)
      throw new Error(`DSL out of sync: ${path}`);
  } else writeFileSync(path, next);
}
const fixedPath = 'dify/benchmarks/fixed-comparison.yml';
const fixed = YAML.parse(readFileSync(fixedPath, 'utf8'));
for (const [id, source] of [
  ['fixed', 'fixed_comparison'],
  ['validate', 'validate_comparison'],
]) {
  const code = readFileSync(`dify/code/${source}.py`, 'utf8').replace(
    '__CATALOG_JSON__',
    JSON.stringify(
      JSON.parse(readFileSync('dify/agent/skills/catalog-compare/references/catalog.json', 'utf8')),
    ),
  );
  const node = fixed.workflow.graph.nodes.find((n: { id: string }) => n.id === id);
  if (process.argv.includes('--check')) {
    if (node.data.code !== code) throw Error(`Benchmark DSL out of sync: ${id}`);
  } else node.data.code = code;
}
if (!process.argv.includes('--check'))
  writeFileSync(fixedPath, YAML.stringify(fixed, { lineWidth: 0 }));
console.log('Dify DSL code, prompts and schemas are in sync.');
