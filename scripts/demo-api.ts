import { createHmac } from 'node:crypto';
const base = 'http://127.0.0.1:4318';
const token = process.env.APP_TOKEN,
  secret = process.env.WEBHOOK_SECRET;
if (!token || !secret) throw new Error('Start eerst setup:local en server.');
const input = {
  eventId: 'api-demo-001',
  name: 'Robin Demo',
  email: 'robin@example.com',
  message: 'Graag DD-204 bezoeken. Kan een collega mij contacteren?',
  channel: 'website',
};
const raw = JSON.stringify(input),
  timestamp = String(Math.floor(Date.now() / 1000));
const signature = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex');
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
async function call(path: string, options: RequestInit = {}) {
  const r = await fetch(base + path, { ...options, headers: { ...headers, ...options.headers } });
  const data = await r.json();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${JSON.stringify(data)}`);
  return data;
}
const received = await call('/api/webhooks/leads', {
  method: 'POST',
  headers: { 'x-timestamp': timestamp, 'x-signature': signature },
  body: raw,
});
const again = await call('/api/webhooks/leads', {
  method: 'POST',
  headers: { 'x-timestamp': timestamp, 'x-signature': signature },
  body: raw,
});
if (!again.duplicate || again.lead.id !== received.lead.id)
  throw new Error('Deduplicatie mislukt.');
console.log('Webhook ontvangen; herhaling levert hetzelfde record.');
if (received.lead.status === 'review')
  await call(`/api/leads/${input.eventId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ version: received.lead.version }),
  });
await call('/api/outbox/dispatch', { method: 'POST', body: '{}' });
const status = await call('/api/leads');
const lead = status.leads.find((x: { id: string }) => x.id === input.eventId);
if (lead.status !== 'synced')
  throw new Error(
    `Niet afgehandeld: ${lead.status}. Controleer catalogusouderdom of gebeurtenissen.`,
  );
console.log(
  `Leadstatus: ${lead.status}. CRM-records totaal: ${status.crmRecords}. E-mails: ${status.sentEmails}.`,
);
console.log(
  'Opnieuw uitvoeren maakt voor hetzelfde event geen extra record. CRM blijft een lokale mock.',
);
