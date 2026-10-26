import { readFileSync, writeFileSync } from 'node:fs';
import YAML from 'yaml';
const apps = [
  { file: 'lead-intake', prompt: 'lead-system', code: { validate: 'validate_lead' } },
  {
    file: 'operations-assistant',
    prompt: 'assistant-system',
    code: { prepare: 'prepare_context', validate: 'validate_assistant' },
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
      node.data.code = readFileSync(`dify/code/${file}.py`, 'utf8');
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
  const next = YAML.stringify(doc, { lineWidth: 0 });
  if (process.argv.includes('--check')) {
    if (YAML.stringify(YAML.parse(readFileSync(path, 'utf8')), { lineWidth: 0 }) !== next)
      throw new Error(`DSL out of sync: ${path}`);
  } else writeFileSync(path, next);
}
console.log('Dify DSL code, prompts and schemas are in sync.');
