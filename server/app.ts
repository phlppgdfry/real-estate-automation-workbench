import { RunLedger, type RunBudget } from './run-ledger';
import { workspaceRoute } from './workspace';
import { readFileSync, existsSync, statSync, createReadStream } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { ComparisonInputSchema } from '../src/comparison-contract';
import { analyseDify, assistDify, reviewDocumentDify, compareDify } from './dify-services';
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
  difyAgentKey?: string;
  difyDocumentKey?: string;
  difyComparisonKey?: string;
  difyKnowledgeKey?: string;
  difyKnowledgeDatasetId?: string;
  runBudget?: RunBudget;
  crmTestUrl?: string;
  staticRoot?: string;
  difyBaseUrl?: string;
  difyUser?: string;
};
export function signature(secret: string, timestamp: string, raw: string) {
  return createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex');
}
async function body(req: IncomingMessage, maximum = 16384) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > maximum) throw new DomainError('SIZE', 'Bericht te groot.');
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
  const ledger = new RunLedger(config.store, config.runBudget);
  const clock = config.now ?? (() => new Date().toISOString());
  const extract: Extractor | undefined =
    config.extract ??
    (config.difyKey
      ? async (input) => {
          const id = ledger.start('intake', 'system-worker', input.eventId, 'gpt-4o-mini', clock());
          try {
            const result = await analyseDify(input, {
              apiKey: config.difyKey!,
              baseUrl: config.difyBaseUrl,
              user: config.difyUser,
              timeoutMs: 20000,
            });
            ledger.finish(id, 'succeeded', clock(), result);
            return result.extraction;
          } catch (error) {
            ledger.finish(id, 'failed', clock(), undefined, 'INTAKE_PROVIDER_REJECTED');
            throw error;
          }
        }
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
      if (
        (req.method === 'GET' || req.method === 'HEAD') &&
        config.staticRoot &&
        !path.startsWith('/api/')
      ) {
        const root = resolve(config.staticRoot);
        const relative = path
          .replace(/^\/real-estate-automation-workbench/, '')
          .replace(/^\/+/, '');
        const file = resolve(root, relative || 'index.html');
        if (file.startsWith(root + sep) && existsSync(file) && statSync(file).isFile()) {
          const mime: Record<string, string> = {
            '.html': 'text/html; charset=utf-8',
            '.js': 'text/javascript; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.json': 'application/json',
            '.png': 'image/png',
            '.svg': 'image/svg+xml',
            '.txt': 'text/plain; charset=utf-8',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
          };
          const size = statSync(file).size;
          let start = 0,
            end = size - 1;
          const range = req.headers.range;
          if (range) {
            const match = /^bytes=(\d*)-(\d*)$/.exec(range);
            if (match && (match[1] || match[2])) {
              start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
              end = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
            }
            if (
              !match ||
              (!match[1] && !match[2]) ||
              !Number.isSafeInteger(start) ||
              !Number.isSafeInteger(end) ||
              start > end ||
              start >= size ||
              (match[1] === '' && Number(match[2]) === 0)
            ) {
              res.writeHead(416, { 'Content-Range': `bytes */${size}` });
              return res.end();
            }
          }
          res.writeHead(range ? 206 : 200, {
            'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
            'Content-Length': Math.max(0, end - start + 1),
            'Accept-Ranges': 'bytes',
            ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}),
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'no-store',
            'Content-Security-Policy':
              "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'",
          });
          if (req.method === 'HEAD' || size === 0) return res.end();
          const stream = createReadStream(file, { start, end });
          stream.on('error', () => res.destroy());
          res.on('close', () => stream.destroy());
          return stream.pipe(res);
        }
        return send(res, 404, { error: 'NOT_FOUND' });
      }
      const principal = authenticate(String(req.headers.authorization ?? ''), config.credentials);
      if (!principal) return send(res, 401, { error: 'AUTH' });
      const permit = (permission: 'read' | 'review' | 'operate') => {
        if (allowed(principal, permission)) return true;
        send(res, 403, { error: 'FORBIDDEN' });
        return false;
      };
      if (path.startsWith('/api/workspace')) {
        const raw =
          req.method === 'POST'
            ? JSON.parse(await body(req, path === '/api/workspace/documents' ? 2900000 : 16384))
            : undefined;
        const result = await workspaceRoute(
          path,
          req.method ?? 'GET',
          raw,
          principal,
          config,
          clock,
          ledger,
        );
        if (result) return send(res, result.status, result.data);
      }
      if (path === '/api/dify/status' && req.method === 'GET') {
        if (!permit('read')) return;
        return send(res, 200, {
          analysis: Boolean(config.difyKey),
          assistant: Boolean(config.difyAgentKey),
          document: Boolean(config.difyDocumentKey),
          comparison: Boolean(config.difyComparisonKey),
          requiresHuman: true,
        });
      }
      if (path.startsWith('/api/dify/') && req.method === 'POST') {
        if (!permit('review')) return;
        const key =
          path === '/api/dify/analyse'
            ? config.difyKey
            : path === '/api/dify/assist'
              ? config.difyAgentKey
              : path === '/api/dify/document'
                ? config.difyDocumentKey
                : path === '/api/dify/compare'
                  ? config.difyComparisonKey
                  : undefined;
        if (
          ![
            '/api/dify/analyse',
            '/api/dify/assist',
            '/api/dify/document',
            '/api/dify/compare',
          ].includes(path)
        )
          return send(res, 404, { error: 'NOT_FOUND' });
        if (!key) return send(res, 503, { error: 'DIFY_NOT_CONFIGURED' });
        const raw = JSON.parse(await body(req));
        const options = { apiKey: key, baseUrl: config.difyBaseUrl, user: config.difyUser };
        // Validate requests separately from upstream output: provider contract failures are 502.
        const input =
          path === '/api/dify/compare'
            ? ComparisonInputSchema.parse(raw)
            : path === '/api/dify/analyse'
              ? z
                  .object({ message: z.string().trim().min(10).max(4000) })
                  .strict()
                  .parse(raw)
              : path === '/api/dify/assist'
                ? z
                    .object({
                      leadId: z.string().min(1).max(100),
                      question: z.string().trim().min(10).max(1000),
                    })
                    .strict()
                    .parse(raw)
                : z
                    .object({ text: z.string().trim().min(20).max(12000) })
                    .strict()
                    .parse(raw);
        const localRunId = ledger.start(
          path.split('/').at(-1)!,
          principal.subject,
          'leadId' in input ? input.leadId : null,
          path.endsWith('/compare') ? 'gpt-5.6-luna' : 'gpt-4o-mini',
          clock(),
        );
        async function tracked<T>(work: Promise<T>) {
          const result = await work;
          ledger.finish(localRunId, 'succeeded', clock(), result);
          return { ...result, localRunId };
        }
        try {
          if ('maxPrice' in input)
            return send(res, 200, await tracked(compareDify(input, options)));
          if ('message' in input)
            return send(
              res,
              200,
              await tracked(
                analyseDify(
                  {
                    message: input.message,
                    eventId: 'preview',
                    name: 'Demo',
                    email: 'demo@example.com',
                    channel: 'website',
                  },
                  options,
                ),
              ),
            );
          if ('question' in input) {
            const lead = config.store.get(input.leadId);
            return send(
              res,
              200,
              await tracked(
                assistDify(lead, config.listings, input.question, options, principal.subject),
              ),
            );
          }
          return send(res, 200, await tracked(reviewDocumentDify(input.text, options)));
        } catch (error) {
          ledger.finish(localRunId, 'failed', clock(), undefined, 'PROVIDER_OR_SOURCE_REJECTED');
          if (error instanceof DomainError && error.code === 'NOT_FOUND')
            return send(res, 404, { error: 'NOT_FOUND' });
          return send(res, 502, {
            error: 'DIFY_REVIEW_REQUIRED',
            message:
              'Dify gaf geen controleerbaar resultaat. Probeer opnieuw of draag over aan een medewerker.',
          });
        }
      }
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
