import { createHmac } from 'node:crypto';
const base = 'http://127.0.0.1:4318';
const tokens = {
  reader: process.env.READER_TOKEN,
  reviewer: process.env.REVIEWER_TOKEN,
  operator: process.env.OPERATOR_TOKEN,
};
const secret = process.env.WEBHOOK_SECRET;
if (!secret || Object.values(tokens).some((v) => !v))
  throw new Error('Start eerst setup:local en server.');
const input = {
  eventId: 'api-demo-001',
  name: 'Robin Demo',
  email: 'robin@example.com',
  message: 'Graag DD-204 bezoeken. Kan een collega mij contacteren?',
  channel: 'website',
};
const raw = JSON.stringify(input),
  timestamp = String(Math.floor(Date.now() / 1000));
const signed = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex');
async function call(path: string, role: keyof typeof tokens = 'reader', options: RequestInit = {}) {
  const response = await fetch(base + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens[role]}`,
      ...options.headers,
    },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${JSON.stringify(result)}`);
  return result;
}
const options = {
  method: 'POST',
  headers: { 'x-timestamp': timestamp, 'x-signature': signed },
  body: raw,
};
const received = await call('/api/webhooks/leads', 'reader', options),
  again = await call('/api/webhooks/leads', 'reader', options);
if (!again.duplicate || again.eventId !== received.eventId)
  throw new Error('Deduplicatie mislukt.');
console.log('Aanvraag duurzaam ontvangen; herhaling levert hetzelfde ontvangstbewijs.');
const forbidden = await fetch(base + '/api/inbox/process', {
  method: 'POST',
  headers: { Authorization: `Bearer ${tokens.reader}` },
  body: '{}',
});
if (forbidden.status !== 403) throw new Error('Rolscheiding ontbreekt.');
console.log('Leesrol kan geen worker starten (403).');
await call('/api/inbox/process', 'operator', { method: 'POST', body: '{}' });
const lead = await call(`/api/leads/${input.eventId}`);
if (lead.status === 'review')
  await call(`/api/leads/${input.eventId}/approve`, 'reviewer', {
    method: 'POST',
    body: JSON.stringify({ version: lead.version }),
  });
await call('/api/outbox/dispatch', 'operator', { method: 'POST', body: '{}' });
const status = await call('/api/leads');
const result = await call(`/api/leads/${input.eventId}`);
if (result.status !== 'synced')
  throw new Error(
    'Niet afgehandeld. Controleer catalogus, inbox en gebeurtenissen; gebruik geen nieuw event-ID.',
  );
console.log(
  `Leadstatus: ${result.status}. CRM-records totaal: ${status.crmRecords}. E-mails: ${status.sentEmails}.`,
);
console.log(
  'Opnieuw uitvoeren maakt geen extra record. Rollen zijn labcredentials; CRM is een lokale mock.',
);
