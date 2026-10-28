import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { knowledgeRequest, type KnowledgeConfig } from '../../server/knowledge-dify';
import procedures from '../../data/knowledge/procedures.json' with { type: 'json' };
const config: KnowledgeConfig = {
  apiKey: process.env.DIFY_KNOWLEDGE_API_KEY ?? '',
  datasetId: process.env.DIFY_KNOWLEDGE_DATASET_ID ?? '',
  baseUrl: process.env.DIFY_API_BASE_URL,
};
if (!config.apiKey || !config.datasetId)
  throw Error('Set DIFY_KNOWLEDGE_API_KEY and DIFY_KNOWLEDGE_DATASET_ID in ignored .env.local.');
const apply = process.argv.includes('--apply');
const fields = z
  .object({
    doc_metadata: z.array(z.object({ id: z.string(), name: z.string(), type: z.string() })),
  })
  .parse(await knowledgeRequest('/metadata', config)).doc_metadata;
const documents: { id: string; name: string }[] = [];
for (let page = 1; page <= 20; page++) {
  const response = z
    .object({
      data: z.array(z.object({ id: z.string(), name: z.string() })),
      has_more: z.boolean(),
    })
    .parse(await knowledgeRequest(`/documents?limit=100&page=${page}`, config));
  documents.push(...response.data);
  if (!response.has_more) break;
  if (page === 20) throw Error('DOCUMENT_PAGINATION_LIMIT');
}
for (const name of ['language', 'state', 'version']) {
  const existing = fields.find((field) => field.name === name);
  if (existing && existing.type !== 'string') throw Error(`METADATA_TYPE_${name}`);
  if (!existing) {
    console.log(`${apply ? 'CREATE' : 'PLAN metadata'} ${name}`);
    if (apply)
      fields.push(
        z
          .object({ id: z.string(), name: z.string(), type: z.string() })
          .parse(await knowledgeRequest('/metadata', config, { name, type: 'string' })),
      );
  }
}
for (const procedure of procedures) {
  const name = `${procedure.id}.md`,
    matching = documents.filter((d) => d.name === name);
  if (matching.length > 1) throw Error(`DUPLICATE_DOCUMENT_NAME_${procedure.id}`);
  console.log(`${apply ? 'SYNC' : 'PLAN document'} ${name}`);
  if (!apply) continue;
  if (process.argv.includes('--keywords-only')) {
    if (!matching[0]) throw Error(`DOCUMENT_MISSING_${procedure.id}`);
    const chunks = z
      .object({
        data: z.array(z.object({ id: z.string(), content: z.string(), status: z.string() })),
      })
      .parse(await knowledgeRequest(`/documents/${matching[0].id}/segments?limit=100`, config));
    const chunk = chunks.data.find((chunk) => chunk.content.includes(procedure.text));
    if (!chunk || chunk.status !== 'completed') throw Error(`CHUNK_NOT_READY_${procedure.id}`);
    await knowledgeRequest(`/documents/${matching[0].id}/segments/${chunk.id}`, config, {
      segment: { keywords: procedure.keywords, enabled: true },
    });
    continue;
  }
  const body = {
    name,
    text: readFileSync(`data/knowledge/documents/${name}`, 'utf8'),
    doc_form: 'text_model',
    doc_language: procedure.language === 'fr' ? 'French' : 'Dutch',
    process_rule: {
      mode: 'custom',
      rules: {
        pre_processing_rules: [
          { id: 'remove_extra_spaces', enabled: false },
          { id: 'remove_urls_emails', enabled: false },
        ],
        segmentation: { separator: '===PROCEDURE_BOUNDARY===', max_tokens: 1024, chunk_overlap: 0 },
      },
    },
  };
  const result = z
    .object({ document: z.object({ id: z.string() }), batch: z.string() })
    .parse(
      await knowledgeRequest(
        matching[0] ? `/documents/${matching[0].id}/update-by-text` : '/document/create-by-text',
        config,
        matching[0] ? body : { ...body, indexing_technique: 'economy' },
      ),
    );
  await knowledgeRequest('/documents/metadata', config, {
    operation_data: [
      {
        document_id: result.document.id,
        partial_update: true,
        metadata_list: [
          ['language', procedure.language],
          ['state', procedure.state],
          ['version', String(procedure.version)],
        ].map(([name, value]) => ({
          id: fields.find((field) => field.name === name)!.id,
          name,
          value,
        })),
      },
    ],
  });
}
console.log(
  apply
    ? 'SYNC submitted; verify indexing and filtered retrieval separately.'
    : 'DRY RUN; use --apply to sync only the five named portfolio documents.',
);
