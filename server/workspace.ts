import { randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import type { Config } from './app';
import { Inbox } from './inbox';
import { RunLedger } from './run-ledger';
import { allowed, type Credential } from './auth';
import { IntakeSchema, DomainError } from '../src/domain';
import { reviewDocumentDify, assistDify, compareDify } from './dify-services';
import { ComparisonInputSchema } from '../src/comparison-contract';
import { validateDocument, DocumentReviewSchema } from '../src/dify-contracts';
import { extractDocument } from './document-extract';
import { KnowledgeInput, retrieveProcedures } from './knowledge';
import { dispatchConnector } from './crm-connector';
import { observeWorkflow, getHumanForm, extractFileDify } from './dify-human';
import { decideDocumentReview, reconcileDocumentReview } from './document-review';
import { retrieveDifyProcedures } from './knowledge-dify';
const Upload = z
  .object({
    leadId: z.string().min(1).max(100),
    filename: z.string().regex(/^[^/\\\0]{1,150}$/),
    base64: z.string().min(1).max(2800000),
    ocr: z.boolean().default(false),
    nativeExtract: z.boolean().default(false),
  })
  .strict();
export function digest(config: Config, now: string) {
  const leads = config.store.all();
  const docs = config.store.db
    .prepare(
      "SELECT lead_id,count(*) count FROM workspace_documents WHERE state!='reviewed' GROUP BY lead_id",
    )
    .all();
  return {
    generatedAt: now,
    requires_human: true,
    sentEmails: 0,
    items: leads
      .filter((l) => l.status !== 'synced')
      .map((l) => ({
        id: l.id,
        status: l.status,
        ageHours: Math.max(0, Math.round((Date.parse(now) - Date.parse(l.receivedAt)) / 3600000)),
        action:
          l.status === 'dead'
            ? 'Operator onderzoekt de vastgelopen overdracht.'
            : l.status === 'manual'
              ? 'Medewerker vult ontbrekende informatie aan.'
              : l.status === 'queued'
                ? 'Operator controleert de overdracht.'
                : 'Reviewer beoordeelt het voorstel.',
      })),
    documents: docs,
  };
}
export async function workspaceRoute(
  path: string,
  method: string,
  raw: unknown,
  principal: Credential,
  config: Config,
  clock: () => string,
  ledger: RunLedger,
) {
  if (!path.startsWith('/api/workspace')) return;
  const permission =
    path.endsWith('/connector') || path.endsWith('/digest/trigger')
      ? 'operate'
      : method === 'GET'
        ? 'read'
        : 'review';
  if (!allowed(principal, permission)) return { status: 403, data: { error: 'FORBIDDEN' } };
  const now = clock();
  const store = config.store;
  if (path === '/api/workspace' && method === 'GET') {
    ledger.recover(now);
    store.transaction(() => {
      const expiring = store.db
        .prepare(
          "SELECT d.run_id FROM content_reviews r JOIN workspace_documents d ON d.id=r.document_id JOIN ai_runs a ON a.id=d.run_id WHERE r.state='pending' AND r.expires_at<=? AND a.state='paused'",
        )
        .all(now) as { run_id: string }[];
      for (const row of expiring)
        ledger.finish(row.run_id, 'failed', now, undefined, 'HUMAN_DEADLINE', 'paused');
      store.db
        .prepare(
          "UPDATE workspace_documents SET state='extracted' WHERE state='analysing' AND run_id IN (SELECT id FROM ai_runs WHERE state='failed')",
        )
        .run();
      store.db
        .prepare(
          "UPDATE content_reviews SET state='expired',version=version+1 WHERE state='pending' AND expires_at<=?",
        )
        .run(now);
      store.db
        .prepare(
          "UPDATE workspace_documents SET state='extracted' WHERE state='awaiting_review' AND id IN (SELECT document_id FROM content_reviews WHERE state='expired') AND id NOT IN (SELECT document_id FROM content_reviews WHERE state='pending')",
        )
        .run();
    });
    const receipts = store.db
      .prepare(
        'SELECT id,state,attempts,revision,received_at,last_error_code FROM inbox ORDER BY received_at DESC LIMIT 100',
      )
      .all();
    return {
      status: 200,
      data: {
        mode: 'local-api',
        leads: store.page(50).leads,
        listings: config.listings,
        inbox: receipts,
        runs: ledger.list(),
        budget: ledger.usage(now),
        documents: store.db
          .prepare(
            'SELECT id,lead_id,filename,media_type,state,created_at,run_id FROM workspace_documents ORDER BY created_at DESC LIMIT 100',
          )
          .all(),
        reviews: store.db
          .prepare(
            'SELECT id,document_id,version,state,proposed,reviewer,comment,created_at,expires_at,(form_token IS NOT NULL) native_human FROM content_reviews ORDER BY created_at DESC LIMIT 100',
          )
          .all(),
        connectorJobs: store.db
          .prepare(
            'SELECT id,lead_id,state,attempts,available_at,error_code,receipt FROM connector_jobs ORDER BY updated_at DESC LIMIT 100',
          )
          .all(),
        digest: digest(config, now),
      },
    };
  }
  if (path === '/api/workspace/intake' && method === 'POST') {
    const input = IntakeSchema.parse(raw);
    return { status: 202, data: new Inbox(store).accept(input, now) };
  }
  if (path === '/api/workspace/documents' && method === 'POST') {
    const input = Upload.parse(raw);
    store.get(input.leadId);
    if (Buffer.from(input.base64, 'base64').toString('base64') !== input.base64)
      throw new DomainError('DOCUMENT_ENCODING', 'Ongeldige bestandsinhoud.');
    const bytes = Buffer.from(input.base64, 'base64');
    const hash = createHash('sha256').update(bytes).digest('hex');
    const old = store.db
      .prepare('SELECT id,state FROM workspace_documents WHERE lead_id=? AND sha256=?')
      .get(input.leadId, hash) as { id: string; state: string } | undefined;
    if (old && !(old.state === 'needs_ocr' && input.ocr))
      return { status: 200, data: { ...old, duplicate: true } };
    let extraction: Awaited<ReturnType<typeof extractDocument>>;
    try {
      extraction = await extractDocument(input.filename, bytes, input.ocr);
    } catch (error) {
      const dependencyMissing = (error as { code?: string }).code === 'ENOENT';
      return {
        status: dependencyMissing ? 503 : 422,
        data: {
          error: dependencyMissing ? 'DOCUMENT_DEPENDENCY_MISSING' : 'DOCUMENT_EXTRACTION_REJECTED',
          message: dependencyMissing
            ? 'Installeer de extractietools uit de installatiegids.'
            : 'Bestand is ongeldig, te groot of niet leesbaar binnen de extractielimieten.',
        },
      };
    }
    if (input.nativeExtract) {
      if (!config.difyDocumentKey) return { status: 503, data: { error: 'DIFY_NOT_CONFIGURED' } };
      if (input.ocr || extraction.state !== 'extracted')
        return { status: 422, data: { error: 'NATIVE_OCR_UNSUPPORTED' } };
      const runId = ledger.start(
        'document_extract',
        principal.subject,
        input.leadId,
        'document-extractor (no LLM)',
        clock(),
      );
      try {
        const remote = await extractFileDify(input.filename, bytes, {
          apiKey: config.difyDocumentKey,
          baseUrl: config.difyBaseUrl,
          user: `document-${hash.slice(0, 24)}`,
        });
        const normalize = (text: string) => text.normalize('NFKC').replace(/\s+/g, ' ').trim();
        if (normalize(remote.source) !== normalize(extraction.source))
          throw Error('EXTRACTION_MISMATCH');
        extraction = {
          ...extraction,
          source: remote.source,
          method: extraction.method + '+dify-verified',
        };
        ledger.finish(runId, 'succeeded', clock(), { run: remote.run });
      } catch {
        ledger.finish(runId, 'failed', clock(), undefined, 'NATIVE_EXTRACTION_UNCONFIRMED');
        return { status: 502, data: { error: 'NATIVE_EXTRACTION_UNCONFIRMED', runId } };
      }
    }
    if (old) {
      store.db
        .prepare(
          "UPDATE workspace_documents SET source=?,media_type=?,state=? WHERE id=? AND state='needs_ocr'",
        )
        .run(extraction.source, extraction.method, extraction.state, old.id);
      return { status: 200, data: { id: old.id, ...extraction } };
    }
    const id = randomUUID();
    store.db
      .prepare(
        'INSERT OR IGNORE INTO workspace_documents(id,lead_id,filename,media_type,sha256,source,state,created_at) VALUES(?,?,?,?,?,?,?,?)',
      )
      .run(
        id,
        input.leadId,
        input.filename,
        extraction.method,
        extraction.sha256,
        extraction.source,
        extraction.state,
        now,
      );
    const stored = store.db
      .prepare('SELECT id FROM workspace_documents WHERE lead_id=? AND sha256=?')
      .get(input.leadId, hash) as { id: string };
    return {
      status: stored.id === id ? 201 : 200,
      data: { id: stored.id, ...extraction, duplicate: stored.id !== id },
    };
  }
  const doc = path.match(/^\/api\/workspace\/documents\/([\w-]+)(?:\/(analyse|source))?$/);
  if (doc) {
    const document = store.db
      .prepare('SELECT * FROM workspace_documents WHERE id=?')
      .get(doc[1]) as
      { id: string; lead_id: string; source: string; state: string; filename: string } | undefined;
    if (!document) throw new DomainError('NOT_FOUND', 'Document ontbreekt.');
    if (doc[2] === 'source' && method === 'GET')
      return { status: 200, data: { id: document.id, source: document.source } };
    if (doc[2] === 'analyse' && method === 'POST') {
      const input = z
        .object({ nativeHuman: z.boolean().default(false) })
        .strict()
        .parse(raw);
      if (!config.difyDocumentKey) return { status: 503, data: { error: 'DIFY_NOT_CONFIGURED' } };
      if (!document.source)
        throw new DomainError('OCR_REQUIRED', 'Dit document vraagt OCR of handmatige tekstinvoer.');
      const claimed = store.db
        .prepare(
          "UPDATE workspace_documents SET state='analysing' WHERE id=? AND state IN ('extracted','rejected')",
        )
        .run(document.id);
      if (!claimed.changes)
        throw new DomainError(
          'DOCUMENT_BUSY',
          'Document is al verwerkt of wordt momenteel beoordeeld.',
        );
      let runId: string;
      try {
        runId = ledger.start('document', principal.subject, document.lead_id, 'gpt-4o-mini', now);
      } catch (error) {
        store.db
          .prepare("UPDATE workspace_documents SET state='extracted' WHERE id=?")
          .run(document.id);
        throw error;
      }
      store.db
        .prepare('UPDATE workspace_documents SET run_id=? WHERE id=?')
        .run(runId, document.id);
      try {
        const reviewId = randomUUID();
        const options = {
          apiKey: config.difyDocumentKey,
          baseUrl: config.difyBaseUrl,
          user: `document-${reviewId}`,
        };
        let formToken: string | undefined, workflowRunId: string | undefined;
        let expiresAt = new Date(Date.parse(clock()) + 86400000).toISOString();
        let result;
        if (input.nativeHuman) {
          const observation = await observeWorkflow(options, {
            inputs: { document_text: document.source, operation: 'human' },
          });
          if (
            observation.state !== 'paused' ||
            !observation.formToken ||
            !observation.validatedProposal
          )
            throw Error('DIFY_HUMAN_PAUSE_MISSING');
          const form = await getHumanForm(observation.formToken, options);
          if (
            !['approve', 'reject'].every((action) => form.user_actions.some((a) => a.id === action))
          )
            throw Error('DIFY_REVIEW_ACTIONS');
          formToken = observation.formToken;
          workflowRunId = observation.workflowRunId;
          expiresAt = new Date(form.expiration_time * 1000).toISOString();
          if (expiresAt <= clock()) throw Error('DIFY_FORM_EXPIRED');
          result = {
            review: validateDocument(JSON.parse(observation.validatedProposal), document.source),
            run: { workflowRunId },
            requires_human: true as const,
          };
        } else result = await reviewDocumentDify(document.source, options);
        store.transaction(() => {
          store.db
            .prepare("UPDATE workspace_documents SET state='awaiting_review',run_id=? WHERE id=?")
            .run(runId, document.id);
          store.db
            .prepare(
              "INSERT INTO content_reviews(id,document_id,state,proposed,created_at,expires_at,form_token,workflow_run_id) VALUES(?,?,'pending',?,?,?,?,?)",
            )
            .run(
              reviewId,
              document.id,
              JSON.stringify(result.review),
              clock(),
              expiresAt,
              formToken ?? null,
              workflowRunId ?? null,
            );
          ledger.finish(runId, input.nativeHuman ? 'paused' : 'succeeded', clock(), result);
        });
        return { status: 200, data: { runId, reviewId, ...result } };
      } catch (error) {
        store.db
          .prepare("UPDATE workspace_documents SET state='extracted' WHERE id=?")
          .run(document.id);
        ledger.finish(runId, 'failed', clock(), undefined, 'PROVIDER_OR_SOURCE_REJECTED');
        return { status: 502, data: { error: 'DOCUMENT_REVIEW_FAILED', runId } };
      }
    }
  }
  const review = path.match(/^\/api\/workspace\/reviews\/([\w-]+)$/);
  if (review && method === 'POST') {
    return decideDocumentReview(review[1], raw, principal, config, clock, ledger);
  }
  const reconcile = path.match(/^\/api\/workspace\/reviews\/([\w-]+)\/reconcile$/);
  if (reconcile && method === 'POST')
    return reconcileDocumentReview(reconcile[1], raw, principal, config, clock, ledger);
  if (path === '/api/workspace/knowledge' && method === 'POST') {
    const input = KnowledgeInput.parse(raw);
    if (input.native) {
      if (!config.difyKnowledgeKey || !config.difyKnowledgeDatasetId)
        return { status: 503, data: { error: 'KNOWLEDGE_NOT_CONFIGURED' } };
      try {
        return {
          status: 200,
          data: await retrieveDifyProcedures(input.question, input.language, {
            apiKey: config.difyKnowledgeKey,
            datasetId: config.difyKnowledgeDatasetId,
            baseUrl: config.difyBaseUrl,
          }),
        };
      } catch {
        return { status: 502, data: { error: 'KNOWLEDGE_RETRIEVAL_UNCONFIRMED' } };
      }
    }
    return { status: 200, data: retrieveProcedures(input.question, input.language) };
  }
  const caseRun = path.match(/^\/api\/workspace\/leads\/([\w-]+)\/(assist|compare)$/);
  if (caseRun && method === 'POST') {
    const lead = store.get(caseRun[1]);
    const tool = caseRun[2];
    const key = tool === 'assist' ? config.difyAgentKey : config.difyComparisonKey;
    if (!key) return { status: 503, data: { error: 'DIFY_NOT_CONFIGURED' } };
    const input =
      tool === 'assist'
        ? z
            .object({ question: z.string().trim().min(5).max(1000) })
            .strict()
            .parse(raw)
        : ComparisonInputSchema.parse(raw);
    const runId = ledger.start(
      tool,
      principal.subject,
      lead.id,
      tool === 'compare' ? 'gpt-5.6-luna' : 'gpt-4o-mini',
      now,
    );
    try {
      const options = { apiKey: key, baseUrl: config.difyBaseUrl };
      const result =
        tool === 'assist'
          ? await assistDify(lead, config.listings, input.question, options, principal.subject)
          : await compareDify(ComparisonInputSchema.parse(input), options);
      ledger.finish(runId, 'succeeded', clock(), result);
      return { status: 200, data: { ...result, localRunId: runId } };
    } catch {
      ledger.finish(runId, 'failed', clock(), undefined, 'PROVIDER_OR_SOURCE_REJECTED');
      return { status: 502, data: { error: 'CASE_RUN_FAILED', runId } };
    }
  }
  if (path === '/api/workspace/traces' && method === 'GET') {
    return {
      status: 200,
      data: {
        format: 'workbench-trace-v1',
        generatedAt: now,
        runs: ledger.list(),
        privacy: 'Metadata only: no prompts, document text, credentials or review links.',
      },
    };
  }
  if (path === '/api/workspace/digest' && method === 'GET')
    return { status: 200, data: digest(config, now) };
  if (path === '/api/workspace/digest/trigger' && method === 'POST') {
    const input = z
      .object({
        eventId: z.string().regex(/^[\w-]{3,100}$/),
        kind: z.enum(['schedule', 'integration', 'manual']),
      })
      .strict()
      .parse(raw);
    const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const old = store.db
      .prepare('SELECT fingerprint,result FROM workflow_events WHERE event_id=?')
      .get(input.eventId) as { fingerprint: string; result: string } | undefined;
    if (old) {
      if (old.fingerprint !== fingerprint)
        throw new DomainError('IDEMPOTENCY', 'Event-ID heeft andere inhoud.');
      return { status: 200, data: { ...JSON.parse(old.result), duplicate: true } };
    }
    const result = digest(config, now);
    store.db
      .prepare('INSERT INTO workflow_events VALUES(?,?,?,?,?)')
      .run(input.eventId, input.kind, fingerprint, now, JSON.stringify(result));
    return { status: 200, data: result };
  }
  const connector = path.match(/^\/api\/workspace\/leads\/([\w-]+)\/connector$/);
  if (connector && method === 'POST') {
    const input = z.object({ version: z.number().int().positive() }).strict().parse(raw);
    if (!config.crmTestUrl) return { status: 503, data: { error: 'CONNECTOR_NOT_CONFIGURED' } };
    return {
      status: 200,
      data: await dispatchConnector(
        store,
        connector[1],
        input.version,
        config.listings,
        config.crmTestUrl,
        clock,
      ),
    };
  }
  return { status: 404, data: { error: 'NOT_FOUND' } };
}
