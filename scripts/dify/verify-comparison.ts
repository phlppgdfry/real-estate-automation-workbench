import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ComparisonInputSchema, validateComparison } from '../../src/comparison-contract';
const base = process.env.LOCAL_API_URL ?? 'http://127.0.0.1:4318';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname))
  throw Error('LOCAL_ONLY');
const proof = JSON.parse(readFileSync('data/agent/workflow-preview.json', 'utf8'));
const input = ComparisonInputSchema.parse(proof.input);
const response = await fetch(`${base}/api/dify/compare`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.REVIEWER_TOKEN}`,
  },
  body: JSON.stringify(input),
  signal: AbortSignal.timeout(85000),
});
if (!response.ok) throw Error(`COMPARISON_HTTP_${response.status}`);
const result = await response.json();
validateComparison(result.comparison, input);
const entry = {
  tool: 'compare',
  configuredModel: 'gpt-5.6-luna',
  status: 'passed',
  recordedAt: new Date().toISOString(),
  mode: 'authenticated local API → published Dify Workflow → native Agent → Python guard → TypeScript guard',
  dslSha256: createHash('sha256')
    .update(readFileSync('dify/apps/agent-comparison.yml'))
    .digest('hex'),
  input,
  result,
};
writeFileSync('data/agent/local-api-proof.json', JSON.stringify(entry, null, 2) + '\n');
const evidence = JSON.parse(readFileSync('public/dify/evidence.json', 'utf8'));
delete evidence.model;
evidence.configuredModels = { originalApps: 'gpt-4o-mini', nativeAgent: 'gpt-5.6-luna' };
evidence.cases = evidence.cases.filter((c: { tool: string }) => c.tool !== 'compare');
evidence.cases.push(entry);
writeFileSync('public/dify/evidence.json', JSON.stringify(evidence, null, 2) + '\n');
console.log(
  'PASS published native Agent workflow through authenticated local API; independent guards passed. No credentials printed.',
);
