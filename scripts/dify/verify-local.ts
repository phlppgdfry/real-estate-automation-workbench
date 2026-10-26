import { createHmac } from 'node:crypto';
import { writeFileSync, readFileSync } from 'node:fs';
const base = process.env.LAB_API_URL ?? 'http://127.0.0.1:4318';
const keys = {
  reader: process.env.READER_TOKEN,
  reviewer: process.env.REVIEWER_TOKEN,
  operator: process.env.OPERATOR_TOKEN,
};
if (Object.values(keys).some((x) => !x) || !process.env.WEBHOOK_SECRET)
  throw new Error('Local configuration missing.');
async function call(
  path: string,
  role: keyof typeof keys = 'reader',
  data?: unknown,
  headers = {},
) {
  const response = await fetch(base + path, {
    method: data ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${keys[role]}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(`HTTP_${response.status}_${value.error}`);
  return value;
}
const status = await call('/api/dify/status');
if (!status.analysis || !status.assistant || !status.document)
  throw new Error('Not all apps configured');
const now = new Date().toISOString(),
  eventId = `dify-e2e-${Date.now()}`;
const input = {
  eventId,
  name: 'Robin Demo',
  email: 'robin@example.com',
  message: 'Ik wil DD-204 bezoeken.',
  channel: 'website',
};
const raw = JSON.stringify(input),
  timestamp = String(Math.floor(Date.now() / 1000));
const signed = createHmac('sha256', process.env.WEBHOOK_SECRET!)
  .update(`${timestamp}.${raw}`)
  .digest('hex');
const receipt = await call('/api/webhooks/leads', 'reader', input, {
  'x-timestamp': timestamp,
  'x-signature': signed,
});
if (receipt.state !== 'pending') throw new Error('Receipt not pending');
const work = await call('/api/inbox/process', 'operator', { limit: 10 });
if (work.failed || !work.completed) throw new Error('Analysis worker failed');
const lead = await call(`/api/leads/${eventId}`);
if (lead.extraction.intent !== 'visit' || lead.status !== 'review')
  throw new Error('Lead not ready for human review');
await call(`/api/leads/${eventId}/approve`, 'reviewer', { version: lead.version });
await call('/api/outbox/dispatch', 'operator', { simulateFailure: false });
const delivered = await call(`/api/leads/${eventId}`);
if (delivered.status !== 'synced') throw new Error('Not delivered');
const assistant = await call('/api/dify/assist', 'reviewer', {
  leadId: eventId,
  question: 'Wat is de huidige werkstatus en wat moet een medewerker controleren?',
});
const document = await call('/api/dify/document', 'reviewer', {
  text: readFileSync('data/dify/fictieve-pandfiche.txt', 'utf8'),
});
const analysis = await call('/api/dify/analyse', 'reviewer', {
  message: 'Kunt u een waardebepaling van mijn woning in Oudenburg regelen?',
});
const operations = await call('/api/operations');
if (operations.sentEmails !== 0) throw new Error('Unexpected email transport');
const report = {
  recordedAt: now,
  status: 'passed',
  mode: 'Dify Cloud via local authenticated HTTP API',
  eventId,
  steps: [
    'signed durable receipt',
    'Dify worker extraction',
    'catalogue check',
    'human approval',
    'transactional outbox',
    'durable CRM mock receipt',
    'read-only assistant',
    'text document review',
    'analysis preview',
  ],
  leadStatus: delivered.status,
  extraction: lead.extraction,
  assistant,
  document,
  analysis,
  sentEmails: 0,
};
writeFileSync('public/dify/local-verification.json', JSON.stringify(report, null, 2) + '\n');
console.log(
  `PASS full Dify local chain: ${eventId}; sentEmails=0. Evidence saved without credentials.`,
);
