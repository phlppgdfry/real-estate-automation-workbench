import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { z } from 'zod';
import { makeServer } from './app';
import { Store } from './store';
const token = process.env.APP_TOKEN;
const webhookSecret = process.env.WEBHOOK_SECRET;
if (!token || token.length < 24 || !webhookSecret || webhookSecret.length < 24)
  throw new Error(
    'APP_TOKEN en WEBHOOK_SECRET moeten elk minstens 24 tekens bevatten. Gebruik npm run setup:local.',
  );
mkdirSync('var', { recursive: true, mode: 0o700 });
const listingSchema = z.array(
  z.object({
    id: z.string().regex(/^DD-\d{3}$/),
    title: z.string(),
    city: z.string(),
    price: z.number().positive(),
    status: z.enum(['available', 'sold']),
    checkedAt: z.iso.datetime(),
  }),
);
if (!existsSync('var/catalog.json'))
  throw new Error('Lokale catalogus ontbreekt. Gebruik npm run setup:local.');
const listings = listingSchema.parse(JSON.parse(readFileSync('var/catalog.json', 'utf8')));
const store = new Store('var/leads.sqlite');
const server = makeServer({
  store,
  token,
  webhookSecret,
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
