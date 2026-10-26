import { z } from 'zod';
export const ContextFactSchema = z
  .object({ id: z.string().min(1).max(30), text: z.string().min(1).max(1000) })
  .strict();
export type ContextFact = z.infer<typeof ContextFactSchema>;
export const AssistanceSchema = z
  .object({
    summary: z.string().min(1).max(1500),
    facts: z
      .array(z.object({ source_id: z.string(), quote: z.string().min(1).max(1000) }).strict())
      .max(20),
    risks: z.array(z.string().max(500)).max(10),
    next_action: z.string().min(1).max(1500),
    requires_human: z.literal(true),
  })
  .strict();
export type Assistance = z.infer<typeof AssistanceSchema>;
const fields = ['reference', 'price', 'city', 'status', 'epc', 'area'] as const;
export const DocumentReviewSchema = z
  .object({
    document_type: z.enum(['property-sheet', 'other', 'unknown']),
    facts: z
      .array(
        z
          .object({
            field: z.enum(fields),
            value: z.string().min(1).max(1000),
            quote: z.string().min(1).max(1500),
          })
          .strict(),
      )
      .max(6),
    missing_fields: z.array(z.enum(fields)).max(6),
    risks: z.array(z.string().max(500)).max(10),
    requires_human: z.literal(true),
  })
  .strict();
export type DocumentReview = z.infer<typeof DocumentReviewSchema>;
export function validateAssistance(raw: unknown, facts: ContextFact[]): Assistance {
  const value = AssistanceSchema.parse(raw),
    sources = new Map(facts.map((f) => [f.id, f.text]));
  if (value.facts.some((f) => sources.get(f.source_id) !== f.quote))
    throw new Error('DIFY_CITATION_NOT_IN_CONTEXT');
  return value;
}
export function minimiseDocument(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL]')
    .replace(/(?<!\w)(?:\+?\d[\d ()/-]{7,}\d)(?!\w)/g, '[PHONE_OR_ID]');
}
export function validateDocument(raw: unknown, source: string): DocumentReview {
  const value = DocumentReviewSchema.parse(raw),
    seen = new Set<string>();
  for (const f of value.facts) {
    if (seen.has(f.field) || !source.includes(f.quote) || !f.quote.includes(f.value))
      throw new Error('DIFY_DOCUMENT_CITATION');
    seen.add(f.field);
  }
  if (value.missing_fields.some((f) => seen.has(f)))
    throw new Error('DIFY_DOCUMENT_MISSING_CONFLICT');
  const missing = new Set([
    ...value.missing_fields,
    ...(['reference', 'price', 'city', 'status'] as const).filter((field) => !seen.has(field)),
  ]);
  return { ...value, missing_fields: [...missing].sort() };
}
