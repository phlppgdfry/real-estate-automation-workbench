import { z } from 'zod';
import catalog from '../dify/agent/skills/catalog-compare/references/catalog.json' with { type: 'json' };
export const ComparisonInputSchema = z
  .object({
    question: z.string().trim().min(10).max(1000),
    city: z.string().trim().min(1).max(80),
    maxPrice: z.number().finite().min(1).max(10000000),
    minBedrooms: z.number().int().min(0).max(20),
  })
  .strict();
export type ComparisonInput = z.infer<typeof ComparisonInputSchema>;
export const ComparisonSchema = z
  .object({
    summary: z.string().min(1).max(2500),
    criteria: z
      .object({ city: z.string(), max_price: z.number(), min_bedrooms: z.number().int() })
      .strict(),
    comparisons: z
      .array(
        z
          .object({
            reference: z.string(),
            title: z.string(),
            city: z.string(),
            price: z.number(),
            status: z.enum(['available', 'sold']),
            bedrooms: z.number().int(),
            source_id: z.string(),
          })
          .strict(),
      )
      .max(6),
    suggested_references: z.array(z.string()).max(6),
    excluded: z
      .array(
        z
          .object({
            reference: z.string(),
            reasons: z
              .array(z.enum(['sold', 'city', 'price', 'bedrooms']))
              .min(1)
              .max(4),
          })
          .strict(),
      )
      .max(6),
    questions: z.array(z.string().max(500)).max(5),
    requires_human: z.literal(true),
  })
  .strict();
export function validateComparison(raw: unknown, input: ComparisonInput) {
  const value = ComparisonSchema.parse(raw);
  const fail = (condition: boolean) => {
    if (condition) throw new Error('DIFY_COMPARISON_SOURCE_OR_CRITERIA');
  };
  fail(
    !value.summary.includes(catalog.snapshot) ||
      value.criteria.city !== input.city ||
      value.criteria.max_price !== input.maxPrice ||
      value.criteria.min_bedrooms !== input.minBedrooms,
  );
  const reasons = (p: (typeof catalog.listings)[number]) => [
    ...(p.status !== 'available' ? ['sold'] : []),
    ...(p.city.toLocaleLowerCase() !== input.city.trim().toLocaleLowerCase() ? ['city'] : []),
    ...(p.price > input.maxPrice ? ['price'] : []),
    ...(p.bedrooms < input.minBedrooms ? ['bedrooms'] : []),
  ];
  const seen = new Set<string>();
  for (const row of value.comparisons) {
    const p = catalog.listings.find((p) => p.id === row.reference);
    fail(!p || seen.has(row.reference) || row.source_id !== `catalog:${row.reference}`);
    if (!p) throw new Error('DIFY_COMPARISON_SOURCE');
    fail((['title', 'city', 'price', 'status', 'bedrooms'] as const).some((k) => row[k] !== p[k]));
    seen.add(row.reference);
  }
  const expected = catalog.listings
    .filter((p) => !reasons(p).length)
    .map((p) => p.id)
    .sort();
  fail(
    new Set(value.suggested_references).size !== value.suggested_references.length ||
      JSON.stringify([...value.suggested_references].sort()) !== JSON.stringify(expected) ||
      value.suggested_references.some((r) => !seen.has(r)),
  );
  const excluded = new Set<string>();
  for (const row of value.excluded) {
    const p = catalog.listings.find((p) => p.id === row.reference);
    fail(
      !p ||
        excluded.has(row.reference) ||
        (!!p && row.reasons.some((r) => !reasons(p).includes(r))),
    );
    excluded.add(row.reference);
  }
  return value;
}
