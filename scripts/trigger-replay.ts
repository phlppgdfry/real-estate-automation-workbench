import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { z } from 'zod';

const path = process.argv[2] ?? 'data/trigger/native-event.json';
const event = z
  .object({ eventId: z.string().regex(/^[\w-]{3,100}$/), kind: z.literal('schedule') })
  .strict()
  .parse(JSON.parse(readFileSync(path, 'utf8')));
const url = new URL(process.env.LAB_API_URL ?? 'http://127.0.0.1:4318');
if (
  url.protocol !== 'http:' ||
  !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
  url.username ||
  url.password
)
  throw Error('LOCAL_ONLY');
if (!process.env.OPERATOR_TOKEN) throw Error('OPERATOR_CONFIGURATION_REQUIRED');
const responses = [];
for (let i = 0; i < 2; i++) {
  const response = await fetch(new URL('/api/workspace/digest/trigger', url), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPERATOR_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw Error(`TRIGGER_HTTP_${response.status}`);
  const data = await response.json();
  if (data.sentEmails !== 0 || data.requires_human !== true || (i === 1 && data.duplicate !== true))
    throw Error('TRIGGER_RECEIPT_UNCONFIRMED');
  responses.push({
    httpStatus: response.status,
    duplicate: data.duplicate === true,
    sentEmails: data.sentEmails,
  });
}
mkdirSync('var', { recursive: true });
writeFileSync(
  'var/trigger-replay.json',
  JSON.stringify(
    {
      recordedAt: new Date().toISOString(),
      status: 'passed',
      event,
      responses,
      mode: 'Explicit operator replay of recorded Dify event over localhost HTTP; not an automatic Cloud connection',
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'PASS event received; repeated delivery is a duplicate; no email sent. Evidence: var/trigger-replay.json',
);
