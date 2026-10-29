import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { z } from 'zod';
import { makeServer } from './app';
import { Store } from './store';
import { ListingSchema } from '../src/domain';
const reviewer = process.env.REVIEWER_TOKEN;
const operator = process.env.OPERATOR_TOKEN;
const reader = process.env.READER_TOKEN;
const webhookSecret = process.env.WEBHOOK_SECRET;
if (![reviewer, operator, reader, webhookSecret].every((value) => value && value.length >= 24))
  throw new Error(
    'REVIEWER_TOKEN, OPERATOR_TOKEN, READER_TOKEN en WEBHOOK_SECRET moeten elk minstens 24 tekens bevatten. Gebruik npm run setup:local.',
  );
mkdirSync('var', { recursive: true, mode: 0o700 });
const listingSchema = z.array(ListingSchema);
if (!existsSync('var/catalog.json'))
  throw new Error('Lokale catalogus ontbreekt. Gebruik npm run setup:local.');
const listings = listingSchema.parse(JSON.parse(readFileSync('var/catalog.json', 'utf8')));
const store = new Store('var/leads.sqlite');
const server = makeServer({
  store,
  credentials: [
    { token: reviewer!, subject: 'lab-reviewer', roles: ['reviewer'] },
    { token: operator!, subject: 'lab-operator', roles: ['operator'] },
    { token: reader!, subject: 'lab-reader', roles: ['reader'] },
  ],
  webhookSecret: webhookSecret!,
  listings,
  aiKey: process.env.OPENAI_API_KEY,
  aiModel: process.env.OPENAI_MODEL,
  difyKey: process.env.DIFY_WORKFLOW_API_KEY,
  difyAgentKey: process.env.DIFY_AGENT_API_KEY,
  difyDocumentKey: process.env.DIFY_DOCUMENT_API_KEY,
  difyComparisonKey: process.env.DIFY_COMPARISON_API_KEY,
  difyKnowledgeKey: process.env.DIFY_KNOWLEDGE_API_KEY,
  difyKnowledgeDatasetId: process.env.DIFY_KNOWLEDGE_DATASET_ID,
  staticRoot: 'dist',
  crmTestUrl: process.env.CRM_TEST_URL,
  runBudget: {
    dailyTokens: Number(process.env.DAILY_TOKEN_BUDGET ?? 150000),
    reservationTokens: 25000,
    totalTokenPriceCapMicrosPerMillion: process.env.TOKEN_PRICE_CAP_MICROS_PER_MILLION
      ? Number(process.env.TOKEN_PRICE_CAP_MICROS_PER_MILLION)
      : undefined,
    dailyCostCapMicros: process.env.DAILY_COST_CAP_MICROS
      ? Number(process.env.DAILY_COST_CAP_MICROS)
      : undefined,
  },
  difyBaseUrl: process.env.DIFY_API_BASE_URL,
  difyUser: process.env.DIFY_WORKFLOW_USER,
});
const port = z.coerce
  .number()
  .int()
  .min(1024)
  .max(65535)
  .parse(process.env.PORT ?? 4318);
server.listen(port, '127.0.0.1', () =>
  console.log(`API: http://127.0.0.1:${port} — CRM is een lokale mock; geen e-mailtransport.`),
);
function shutdown() {
  server.close(() => {
    store.close();
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
