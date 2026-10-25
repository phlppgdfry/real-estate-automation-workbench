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
  difyBaseUrl: process.env.DIFY_API_BASE_URL,
  difyUser: process.env.DIFY_WORKFLOW_USER,
});
server.listen(4318, '127.0.0.1', () =>
  console.log('API: http://127.0.0.1:4318 — CRM is een lokale mock; geen e-mailtransport.'),
);
function shutdown() {
  server.close(() => {
    store.close();
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
