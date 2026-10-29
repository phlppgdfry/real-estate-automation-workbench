import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import YAML from 'yaml';
import { ComparisonInputSchema, validateComparison } from '../src/comparison-contract';
import { compareDify } from '../server/dify-services';
import { runDifyWorkflow } from '../server/dify';

const args = new Set(process.argv.slice(2));
if ([...args].some((arg) => !['--live', '--public'].includes(arg))) throw Error('UNKNOWN_OPTION');
if (args.has('--live') && args.has('--public')) throw Error('LIVE_REPORT_STAYS_LOCAL');
const corpus = readFileSync('dify/agent/skills/catalog-compare/references/catalog.json');
const workflowBytes = readFileSync('dify/benchmarks/fixed-comparison.yml', 'utf8');
const workflow = YAML.parse(workflowBytes);
const cases = [
  {
    id: 'nl-matches',
    language: 'nl',
    question: 'Vergelijk de beschikbare panden volgens deze criteria.',
    city: 'Oudenburg',
    maxPrice: 390000,
    minBedrooms: 3,
  },
  {
    id: 'fr-matches',
    language: 'fr',
    question: 'Comparez les biens disponibles selon ces critères explicites.',
    city: 'Oudenburg',
    maxPrice: 390000,
    minBedrooms: 3,
  },
  {
    id: 'empty-city',
    language: 'nl',
    question: 'Welke panden voldoen aan deze expliciete criteria?',
    city: 'Oostende',
    maxPrice: 390000,
    minBedrooms: 3,
  },
  {
    id: 'sold-excluded',
    language: 'nl',
    question: 'Vergelijk alle opties; een verkocht pand is nooit een voorstel.',
    city: 'Oudenburg',
    maxPrice: 1000000,
    minBedrooms: 0,
  },
];
const results: Record<string, unknown>[] = [];
let failed = false;
for (const example of cases) {
  const input = ComparisonInputSchema.parse({
    question: example.question,
    city: example.city,
    maxPrice: example.maxPrice,
    minBedrooms: example.minBedrooms,
  });
  let expected: string[] = [];
  for (const mode of [
    'direct-query',
    'fixed-workflow-local',
    'fixed-workflow-cloud',
    'native-agent-cloud',
  ]) {
    const start = performance.now();
    if (mode.endsWith('-cloud') && !args.has('--live')) {
      results.push({
        caseId: example.id,
        language: example.language,
        mode,
        status: 'not-run',
        reason:
          'No network requests in default mode. Explicit --live and provider budget required.',
        elapsedMs: null,
        totalTokens: null,
      });
      continue;
    }
    const key =
      mode === 'native-agent-cloud'
        ? process.env.DIFY_COMPARISON_API_KEY
        : process.env.DIFY_FIXED_COMPARISON_API_KEY;
    if (mode.endsWith('-cloud') && !key) {
      results.push({
        caseId: example.id,
        language: example.language,
        mode,
        status: 'blocked-configuration',
        elapsedMs: null,
        totalTokens: null,
      });
      continue;
    }
    try {
      let refs: string[],
        tokens: number | null = 0;
      if (mode === 'direct-query') {
        const raw = JSON.parse(
          execFileSync(
            'python3',
            [
              'dify/agent/skills/catalog-compare/scripts/query_catalog.py',
              '--city',
              input.city,
              '--max-price',
              String(input.maxPrice),
              '--min-bedrooms',
              String(input.minBedrooms),
            ],
            { encoding: 'utf8', timeout: 10000 },
          ),
        );
        refs = raw.matches.map((p: { id: string }) => p.id);
        expected = [...refs].sort();
      } else if (mode === 'fixed-workflow-local') {
        // Execute the actual exported Code nodes, in graph order, without pretending to run Dify.
        const fixed = workflow.workflow.graph.nodes.find((n: { id: string }) => n.id === 'fixed')
          .data.code;
        const guard = workflow.workflow.graph.nodes.find((n: { id: string }) => n.id === 'validate')
          .data.code;
        const params = {
          city: input.city,
          max_price: input.maxPrice,
          min_bedrooms: input.minBedrooms,
        };
        const python = (code: string, value: unknown) =>
          JSON.parse(
            execFileSync(
              'python3',
              ['-c', code + '\nimport sys\np=json.load(sys.stdin)\nprint(json.dumps(main(**p)))'],
              { input: JSON.stringify(value), encoding: 'utf8', timeout: 10000 },
            ),
          );
        const output = python(fixed, params);
        const checked = python(guard, { ...params, model_text: output.result });
        refs = validateComparison(JSON.parse(checked.result), input).suggested_references;
      } else {
        const config = {
          apiKey: key!,
          baseUrl: process.env.DIFY_API_BASE_URL,
          user: 'duin-dorp-benchmark',
        };
        if (mode === 'native-agent-cloud') {
          const response = await compareDify(input, config);
          refs = response.comparison.suggested_references;
          tokens = response.run.totalTokens ?? null;
        } else {
          const response = await runDifyWorkflow(
            { city: input.city, max_price: input.maxPrice, min_bedrooms: input.minBedrooms },
            config,
          );
          refs = validateComparison(
            JSON.parse(String(response.outputs.result)),
            input,
          ).suggested_references;
          tokens = response.totalTokens ?? null;
        }
      }
      if (JSON.stringify([...refs].sort()) !== JSON.stringify(expected))
        throw Error('MATCH_SET_DIFFERS');
      results.push({
        caseId: example.id,
        language: example.language,
        mode,
        status: 'passed',
        references: refs,
        elapsedMs: Math.round((performance.now() - start) * 100) / 100,
        totalTokens: tokens,
      });
    } catch (error) {
      failed = true;
      results.push({
        caseId: example.id,
        language: example.language,
        mode,
        status: 'failed',
        error:
          error instanceof Error && /^DIFY_[A-Z_0-9]+$/.test(error.message)
            ? error.message
            : 'EXECUTION_OR_VALIDATION_FAILED',
        elapsedMs: Math.round(performance.now() - start),
        totalTokens: null,
      });
      // Do not repeatedly call an unavailable provider in a benchmark.
      if (mode.endsWith('-cloud')) break;
    }
  }
  if (failed) break;
}
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const report = {
  recordedAt: new Date().toISOString(),
  method:
    'Identical explicit criteria and fictional catalogue. Cloud paths use the same Comparison contract. Local workflow means actual exported Python nodes executed locally, not the Dify runtime.',
  corpusSha256: sha(corpus),
  fixedWorkflowSha256: sha(workflowBytes),
  cases,
  results,
  humanLabels: 'AI-authored fixtures; independent human review pending',
  cost: 'No rates assumed. Default execution uses no model or network. Latency includes Python process startup and is not a production speed ranking.',
  status: failed ? 'failed' : args.has('--live') ? 'live-attempted' : 'local-passed-cloud-not-run',
};
mkdirSync('var', { recursive: true });
const path = args.has('--public') ? 'public/dify/benchmark.json' : 'var/benchmark.json';
writeFileSync(path, JSON.stringify(report, null, 2) + '\n');
if (args.has('--public'))
  writeFileSync('data/benchmark-report.json', JSON.stringify(report, null, 2) + '\n');
console.log(
  `${report.status}: ${results.filter((r) => r.status === 'passed').length} passed; ${results.filter((r) => r.status !== 'passed').length} not passed; ${path}`,
);
if (failed) process.exitCode = 1;
