import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { difyBaseUrl } from './dify';
import procedures from '../data/knowledge/procedures.json' with { type: 'json' };
export type KnowledgeConfig = { apiKey: string; datasetId: string; baseUrl?: string };
export async function knowledgeRequest(
  path: string,
  config: KnowledgeConfig,
  body?: unknown,
  method = body === undefined ? 'GET' : 'POST',
  fetcher: typeof fetch = fetch,
) {
  if (!/^[\w-]+$/.test(config.datasetId)) throw Error('KNOWLEDGE_ID');
  const response = await fetcher(
    `${difyBaseUrl(config.baseUrl)}/v1/datasets/${config.datasetId}${path}`,
    {
      method,
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!response.ok) throw Error(`KNOWLEDGE_HTTP_${response.status}`);
  const reader = response.body?.getReader();
  if (!reader) throw Error('KNOWLEDGE_EMPTY');
  const decoder = new TextDecoder();
  let text = '',
    size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 262144) throw Error('KNOWLEDGE_RESPONSE_TOO_LARGE');
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return JSON.parse(text + decoder.decode()) as unknown;
}
export async function retrieveDifyProcedures(
  question: string,
  language: 'nl' | 'fr',
  config: KnowledgeConfig,
  fetcher: typeof fetch = fetch,
) {
  const raw = await knowledgeRequest(
    '/retrieve',
    config,
    {
      query: question.slice(0, 250),
      retrieval_model: {
        search_method: 'keyword_search',
        reranking_enable: false,
        top_k: 5,
        score_threshold_enabled: false,
        metadata_filtering_conditions: {
          logical_operator: 'and',
          conditions: [
            { name: 'language', comparison_operator: 'is', value: language },
            { name: 'state', comparison_operator: 'is', value: 'current' },
          ],
        },
      },
    },
    'POST',
    fetcher,
  );
  const parsed = z
    .object({
      records: z
        .array(
          z.object({
            segment: z.object({
              content: z.string().max(12000),
              document: z.object({ id: z.string(), name: z.string() }),
            }),
          }),
        )
        .max(20),
    })
    .parse(raw);
  const seen = new Set<string>();
  const sources = parsed.records.flatMap((record) => {
    const reference = procedures.find(
      (p) =>
        `${p.id}.md` === record.segment.document.name &&
        p.language === language &&
        p.state === 'current',
    );
    if (!reference || seen.has(reference.id)) return [];
    const quote = record.segment.content.trim();
    const source = readFileSync(`data/knowledge/documents/${reference.id}.md`, 'utf8');
    if (!quote || !source.includes(reference.text) || !quote.includes(reference.text)) return [];
    seen.add(reference.id);
    return [
      {
        source_id: reference.id,
        title: reference.title,
        version: reference.version,
        quote: reference.text,
        documentId: record.segment.document.id,
      },
    ];
  });
  return {
    mode: 'dify-knowledge-keyword-retrieval',
    question,
    language,
    sources,
    answer: sources.length
      ? sources.map((s) => s.quote).join('\n\n')
      : 'Geen geverifieerde actuele procedure gevonden. Vraag een medewerker om verduidelijking.',
    requires_human: true,
  };
}
