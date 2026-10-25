import { createHmac } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { z } from 'zod';
import { DomainError, IntakeSchema, type Listing } from '../src/domain';
import { extractOpenAI } from './ai';
import { extractDify } from './dify';
import { Store } from './store';
import { Inbox } from './inbox';
import { processInbox, type Extractor } from './analysis-worker';
import { allowed, authenticate, secureEqual, type Credential } from './auth';

export type Config = {
  store: Store;
  credentials: Credential[];
  webhookSecret: string;
  listings: Listing[];
  now?: () => string;
  extract?: Extractor;
  aiKey?: string;
  aiModel?: string;
  difyKey?: string;
  difyBaseUrl?: string;
  difyUser?: string;
};
export function signature(secret: string, timestamp: string, raw: string) {
  return createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex');
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
function send(
  res: ServerResponse,
  status: number,
  data: unknown,
  headers: Record<string, string> = {},
) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(JSON.stringify(data));
}
export function makeServer(config: Config) {
  if (!config.credentials.length || config.credentials.some((c) => !c.token || !c.subject))
    throw new Error('CREDENTIALS_REQUIRED');
  if (new Set(config.credentials.map((c) => c.token)).size !== config.credentials.length)
    throw new Error('TOKENS_MUST_BE_DISTINCT');
  const inbox = new Inbox(config.store);
  const clock = config.now ?? (() => new Date().toISOString());
  const extract: Extractor | undefined =
    config.extract ??
    (config.difyKey
      ? (input) =>
          extractDify(input, {
            apiKey: config.difyKey!,
            baseUrl: config.difyBaseUrl,
            user: config.difyUser,
          })
      : config.aiKey
        ? (input) => extractOpenAI(input, config.aiKey!, config.aiModel ?? 'gpt-4.1-mini')
        : undefined);
  return createServer(async (req, res) => {
    const now = clock(),
      url = new URL(req.url ?? '/', 'http://localhost'),
      path = url.pathname;
    try {
      if (path === '/health' && req.method === 'GET')
        return send(res, 200, {
          status: 'ok',
          mode: config.difyKey ? 'dify' : config.aiKey ? 'openai' : 'rules',
          crm: 'durable-mock',
          sentEmails: 0,
        });
      if (path === '/api/webhooks/leads' && req.method === 'POST') {
        const raw = await body(req),
          timestamp = String(req.headers['x-timestamp'] ?? ''),
          signed = String(req.headers['x-signature'] ?? '');
        if (
          !/^\d+$/.test(timestamp) ||
          Math.abs(Date.parse(now) / 1000 - Number(timestamp)) > 300 ||
          !secureEqual(signed, signature(config.webhookSecret, timestamp, raw))
        )
          return send(res, 401, { error: 'SIGNATURE' });
        const receipt = inbox.accept(IntakeSchema.parse(JSON.parse(raw)), now);
        // No model or network operation before durable acknowledgement.
        return send(res, receipt.state === 'completed' ? 200 : 202, receipt, {
          Location: receipt.statusUrl,
          'Retry-After': '2',
        });
      }
      const principal = authenticate(String(req.headers.authorization ?? ''), config.credentials);
      if (!principal) return send(res, 401, { error: 'AUTH' });
      const permit = (permission: 'read' | 'review' | 'operate') => {
        if (allowed(principal, permission)) return true;
        send(res, 403, { error: 'FORBIDDEN' });
        return false;
      };
      if (path === '/api/leads' && req.method === 'GET') {
        if (!permit('read')) return;
        const query = z
          .object({
            limit: z.coerce.number().int().min(1).max(100).default(50),
            cursor: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
          })
          .parse({
            limit: url.searchParams.get('limit') ?? undefined,
            cursor: url.searchParams.get('cursor') ?? undefined,
          });
        const stats = config.store.stats();
        return send(res, 200, {
          ...config.store.page(query.limit, query.cursor),
          totalLeads: stats.leads,
          crmRecords: stats.crmRecords,
          sentEmails: 0,
        });
      }
      const leadPath = path.match(/^\/api\/leads\/([a-zA-Z0-9_-]+)$/);
      if (leadPath && req.method === 'GET') {
        if (!permit('read')) return;
        return send(res, 200, config.store.get(leadPath[1]));
      }
      const receiptPath = path.match(/^\/api\/inbox\/([a-zA-Z0-9_-]+)$/);
      if (receiptPath && req.method === 'GET') {
        if (!permit('read')) return;
        return send(res, 200, inbox.receipt(receiptPath[1]));
      }
      if (path === '/api/inbox/process' && req.method === 'POST') {
        if (!permit('operate')) return;
        const input = z
          .object({ limit: z.number().int().min(1).max(50).default(10) })
          .strict()
          .parse(JSON.parse(await body(req)));
        return send(
          res,
          200,
          await processInbox(inbox, config.listings, clock, extract, input.limit),
        );
      }
      if (path === '/api/operations' && req.method === 'GET') {
        if (!permit('read')) return;
        const outbox = config.store.db
          .prepare('SELECT status,count(*) count FROM outbox GROUP BY status')
          .all();
        return send(res, 200, {
          inbox: inbox.stats(now),
          outbox,
          schemaVersion: Number(
            (config.store.db.prepare('PRAGMA user_version').get() as { user_version: number })
              .user_version,
          ),
          sentEmails: 0,
        });
      }
      const approval = path.match(/^\/api\/leads\/([a-zA-Z0-9_-]+)\/approve$/);
      if (approval && req.method === 'POST') {
        if (!permit('review')) return;
        const input = z
          .object({ version: z.number().int().positive() })
          .strict()
          .parse(JSON.parse(await body(req)));
        return send(
          res,
          200,
          config.store.approve(approval[1], input.version, principal.subject, config.listings, now),
        );
      }
      const replay = path.match(/^\/api\/(leads|inbox)\/([a-zA-Z0-9_-]+)\/retry$/);
      if (replay && req.method === 'POST') {
        if (!permit('operate')) return;
        if (replay[1] === 'leads') {
          const input = z
            .object({
              version: z.number().int().positive(),
              reason: z.string().trim().min(10).max(500),
            })
            .strict()
            .parse(JSON.parse(await body(req)));
          return send(
            res,
            200,
            config.store.requeue(
              replay[2],
              input.version,
              principal.subject,
              input.reason,
              config.listings,
              now,
            ),
          );
        }
        const input = z
          .object({
            version: z.number().int().positive(),
            reason: z.string().trim().min(10).max(500),
          })
          .strict()
          .parse(JSON.parse(await body(req)));
        return send(
          res,
          200,
          inbox.retry(replay[2], input.version, principal.subject, input.reason, now),
        );
      }
      if (path === '/api/outbox/dispatch' && req.method === 'POST') {
        if (!permit('operate')) return;
        const input = z
          .object({ simulateFailure: z.boolean().default(false) })
          .strict()
          .parse(JSON.parse(await body(req)));
        return send(res, 200, config.store.dispatch(now, input.simulateFailure));
      }
      send(res, 404, { error: 'NOT_FOUND' });
    } catch (error) {
      if (error instanceof DomainError)
        return send(res, error.code === 'NOT_FOUND' ? 404 : error.code === 'SIZE' ? 413 : 409, {
          error: error.code,
          message: error.message,
        });
      if (error instanceof z.ZodError || error instanceof SyntaxError)
        return send(res, 400, { error: 'VALIDATION' });
      send(res, 500, { error: 'INTERNAL' });
    }
  });
}
