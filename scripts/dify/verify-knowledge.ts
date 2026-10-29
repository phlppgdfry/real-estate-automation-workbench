import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  knowledgeRequest,
  retrieveDifyProcedures,
  type KnowledgeConfig,
} from '../../server/knowledge-dify';
import procedures from '../../data/knowledge/procedures.json' with { type: 'json' };
const config: KnowledgeConfig = {
  apiKey: process.env.DIFY_KNOWLEDGE_API_KEY ?? '',
  datasetId: process.env.DIFY_KNOWLEDGE_DATASET_ID ?? '',
  baseUrl: process.env.DIFY_API_BASE_URL,
};
if (!config.apiKey || !config.datasetId) throw Error('KNOWLEDGE_CONFIGURATION_REQUIRED');
const docs = z
  .object({
    data: z.array(
      z.object({ name: z.string(), indexing_status: z.string(), enabled: z.boolean() }),
    ),
  })
  .parse(await knowledgeRequest('/documents?limit=100', config)).data;
for (const source of procedures)
  if (
    !docs.some(
      (doc) => doc.name === `${source.id}.md` && doc.indexing_status === 'completed' && doc.enabled,
    )
  )
    throw Error('KNOWLEDGE_INDEX_NOT_READY');
const nl = await retrieveDifyProcedures('verkocht', 'nl', config);
const fr = await retrieveDifyProcedures('vendu', 'fr', config);
if (
  !nl.sources.some((s) => s.source_id === 'SOP-VISIT-NL-2') ||
  !fr.sources.some((s) => s.source_id === 'SOP-VISIT-FR-1')
)
  throw Error('KNOWLEDGE_RETRIEVAL_EMPTY_OR_WRONG');
const control = z
  .object({
    records: z.array(z.object({ segment: z.object({ document: z.object({ name: z.string() }) }) })),
  })
  .parse(
    await knowledgeRequest('/retrieve', config, {
      query: 'historische',
      retrieval_model: {
        search_method: 'keyword_search',
        reranking_enable: false,
        top_k: 5,
        score_threshold_enabled: false,
        metadata_filtering_conditions: {
          logical_operator: 'and',
          conditions: [
            { name: 'language', comparison_operator: 'is', value: 'nl' },
            { name: 'state', comparison_operator: 'is', value: 'superseded' },
          ],
        },
      },
    }),
  );
if (
  !control.records.length ||
  control.records.some((record) => record.segment.document.name !== 'SOP-VISIT-NL-1.md')
)
  throw Error('KNOWLEDGE_FILTER_CONTROL_FAILED');
const report = {
  recordedAt: new Date().toISOString(),
  mode: 'Dify Cloud Economical Knowledge API; no generative model',
  datasetId: config.datasetId,
  corpusSha256: createHash('sha256').update(JSON.stringify(procedures)).digest('hex'),
  documents: docs,
  checks: [
    { query: 'verkocht', language: 'nl', sources: nl.sources },
    { query: 'vendu', language: 'fr', sources: fr.sources },
    {
      query: 'historische',
      state: 'superseded',
      controlDocuments: control.records.map((r) => r.segment.document.name),
    },
  ],
  status: 'passed',
  limitation:
    'Keyword retrieval on five fictitious curated procedures. No independent relevance benchmark and no evidence for the separate workflow Knowledge Retrieval node.',
};
writeFileSync('public/dify/knowledge-verification.json', JSON.stringify(report, null, 2) + '\n');
console.log(
  'PASS five indexed documents, Dutch/French current-source retrieval and superseded-only filter control; evidence saved without credentials.',
);
