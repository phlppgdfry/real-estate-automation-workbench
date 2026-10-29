import { z } from 'zod';
import { LeadSchema, ListingSchema } from './domain';
export const Snapshot = z.object({
  mode: z.literal('local-api'),
  leads: z.array(LeadSchema),
  listings: z.array(ListingSchema),
  inbox: z.array(z.object({ id: z.string(), state: z.string(), attempts: z.number() })),
  runs: z.array(
    z.object({
      id: z.string(),
      tool: z.string(),
      lead_id: z.string().nullable(),
      state: z.string(),
      started_at: z.string(),
      elapsed_ms: z.number().nullable(),
      total_tokens: z.number().nullable(),
      error_code: z.string().nullable(),
      model: z.string(),
    }),
  ),
  budget: z.object({
    dailyLimit: z.number(),
    chargedTokens: z.number(),
    actualTokens: z.number(),
    unreportedUsageRuns: z.number(),
    runs: z.number(),
    failed: z.number(),
    averageMs: z.number(),
    costStatus: z.string(),
    budgetedCostMicros: z.number().nullable(),
  }),
  documents: z.array(
    z.object({
      id: z.string(),
      lead_id: z.string(),
      filename: z.string(),
      media_type: z.string(),
      state: z.string(),
    }),
  ),
  reviews: z.array(
    z.object({
      id: z.string(),
      document_id: z.string(),
      version: z.number(),
      state: z.string(),
      proposed: z.string(),
      expires_at: z.string(),
      native_human: z.number(),
    }),
  ),
  connectorJobs: z.array(
    z.object({
      id: z.string(),
      lead_id: z.string(),
      state: z.string(),
      attempts: z.number(),
      error_code: z.string().nullable(),
    }),
  ),
  digest: z.object({
    generatedAt: z.string(),
    items: z.array(
      z.object({ id: z.string(), status: z.string(), ageHours: z.number(), action: z.string() }),
    ),
  }),
});
export type SnapshotData = z.infer<typeof Snapshot>;
