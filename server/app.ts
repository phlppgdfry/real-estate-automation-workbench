import { createHmac, timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { z } from 'zod';
import { DomainError, IntakeSchema, type Listing } from '../src/domain';
import { extractOpenAI } from './ai';
import { extractDify } from './dify';
import { Store } from './store';
export type Config = {
  store: Store;
  token: string;
  webhookSecret: string;
  listings: Listing[];
  now?: () => string;
  aiKey?: string;
  aiModel?: string;
  difyKey?: string;
  difyBaseUrl?: string;
  difyUser?: string;
};
export function signature(secret: string, timestamp: string, raw: string) {
  return createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex');
}
function equal(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
async function body(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > 16384) throw new DomainError('SIZE', 'Bericht te groot.');
    chunks.push(bytes);
  }
  return Buffer.concat(chunks).toString('utf8');
}
function send(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(data));
}
export function makeServer(config: Config) {
  return createServer(async (req, res) => {
    const now = config.now?.() ?? new Date().toISOString();
    const path = (req.url ?? '').split('?')[0];
    try {
      if (path === '/health' && req.method === 'GET')
        return send(res, 200, {
          status: 'ok',
          mode: config.difyKey ? 'dify' : config.aiKey ? 'openai' : 'rules',
          crm: 'durable-mock',
          sentEmails: 0,
        });
      if (path === '/api/webhooks/leads' && req.method === 'POST') {
        const raw = await body(req);
        const timestamp = String(req.headers['x-timestamp'] ?? '');
        const signed = String(req.headers['x-signature'] ?? '');
        if (
          !/^\d+$/.test(timestamp) ||
          Math.abs(Date.parse(now) / 1000 - Number(timestamp)) > 300 ||
          !equal(signed, signature(config.webhookSecret, timestamp, raw))
        )
          return send(res, 401, { error: 'SIGNATURE' });
        const input = IntakeSchema.parse(JSON.parse(raw));
        // Dedupe before model invocation: an ordinary webhook retry has no model cost.
        const existing = config.store.all().some((x) => x.id === input.eventId);
        if (existing) return send(res, 200, config.store.ingest(input, config.listings, now));
        let extraction;
        if (config.difyKey) {
          try {
            extraction = await extractDify(input, {
              apiKey: config.difyKey,
              baseUrl: config.difyBaseUrl,
              user: config.difyUser,
            });
          } catch {
            return send(res, 503, {
              error: 'AI_UNAVAILABLE',
              message: 'Niet verwerkt. Bron opnieuw aanbieden of medewerker laten overnemen.',
            });
          }
        } else if (config.aiKey) {
          try {
            extraction = await extractOpenAI(input, config.aiKey, config.aiModel ?? 'gpt-4.1-mini');
          } catch {
            return send(res, 503, {
              error: 'AI_UNAVAILABLE',
              message: 'Niet verwerkt. Bron opnieuw aanbieden of medewerker laten overnemen.',
            });
          }
        }
        const result = config.store.ingest(input, config.listings, now, extraction);
        return send(res, result.duplicate ? 200 : 201, result);
      }
      if (!equal(String(req.headers.authorization ?? ''), `Bearer ${config.token}`))
        return send(res, 401, { error: 'AUTH' });
      // CORS is intentionally absent; browser cross-origin requests are not allowed.
      if (path === '/api/leads' && req.method === 'GET')
        return send(res, 200, { ...config.store.stats(), leads: config.store.all() });
      const approval = path.match(/^\/api\/leads\/([a-zA-Z0-9_-]+)\/approve$/);
      if (approval && req.method === 'POST') {
        const input = z
          .object({ version: z.number().int().positive() })
          .strict()
          .parse(JSON.parse(await body(req)));
        return send(
          res,
          200,
          config.store.approve(
            approval[1],
            input.version,
            'authenticated-reviewer',
            config.listings,
            now,
          ),
        );
      }
      if (path === '/api/outbox/dispatch' && req.method === 'POST') {
        const input = z
          .object({ simulateFailure: z.boolean().default(false) })
          .strict()
          .parse(JSON.parse(await body(req)));
        return send(res, 200, config.store.dispatch(now, input.simulateFailure));
      }
      send(res, 404, { error: 'NOT_FOUND' });
    } catch (e) {
      if (e instanceof DomainError)
        return send(res, e.code === 'NOT_FOUND' ? 404 : e.code === 'SIZE' ? 413 : 409, {
          error: e.code,
          message: e.message,
        });
      if (e instanceof z.ZodError || e instanceof SyntaxError)
        return send(res, 400, { error: 'VALIDATION' });
      // Never echo request bodies, API errors or secrets.
      send(res, 500, { error: 'INTERNAL' });
    }
  });
}
