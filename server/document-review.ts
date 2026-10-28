import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { Config } from './app';
import type { Credential } from './auth';
import type { RunLedger } from './run-ledger';
import { DomainError } from '../src/domain';
import { DocumentReviewSchema, validateDocument } from '../src/dify-contracts';
import { observeWorkflow, submitHumanForm, type WorkflowObservation } from './dify-human';
const Decision = z
  .object({
    version: z.number().int().positive(),
    action: z.enum(['approve', 'reject']),
    comment: z.string().trim().min(5).max(500),
    corrected: DocumentReviewSchema.optional(),
  })
  .strict();
type ReviewRow = {
  id: string;
  version: number;
  state: string;
  expires_at: string;
  document_id: string;
  proposed: string;
  form_token: string | null;
  workflow_run_id: string | null;
  intended_action: 'approve' | 'reject' | null;
  reviewer: string | null;
  comment: string | null;
  run_id: string | null;
  source: string;
};
function load(config: Config, id: string) {
  const row = config.store.db
    .prepare(
      'SELECT r.*,d.source,d.run_id FROM content_reviews r JOIN workspace_documents d ON d.id=r.document_id WHERE r.id=?',
    )
    .get(id) as ReviewRow | undefined;
  if (!row) throw new DomainError('NOT_FOUND', 'Controle ontbreekt.');
  return row;
}
function options(row: ReviewRow, config: Config) {
  if (!config.difyDocumentKey)
    throw new DomainError('DIFY_NOT_CONFIGURED', 'Documentverbinding ontbreekt.');
  return {
    apiKey: config.difyDocumentKey,
    baseUrl: config.difyBaseUrl,
    user: `document-${row.id}`,
  };
}
function submittedComment(row: ReviewRow) {
  return `${row.comment}\nreview_sha256=${createHash('sha256').update(row.proposed).digest('hex')}`;
}
function finish(
  row: ReviewRow,
  config: Config,
  now: string,
  action: 'approve' | 'reject',
  actor: string,
  comment: string,
  proposed: string,
  completeRun?: () => void,
) {
  return config.store.transaction(() => {
    const result = config.store.db
      .prepare(
        'UPDATE content_reviews SET state=?,version=version+1,reviewer=?,comment=?,decided_at=?,proposed=? WHERE id=? AND state=? AND version=?',
      )
      .run(
        action === 'approve' ? 'approved' : 'rejected',
        actor,
        comment,
        now,
        proposed,
        row.id,
        row.state,
        row.version,
      );
    if (!result.changes) throw new DomainError('REVIEW_STATE', 'Controle is inmiddels gewijzigd.');
    config.store.db
      .prepare('UPDATE workspace_documents SET state=? WHERE id=?')
      .run(action === 'approve' ? 'reviewed' : 'rejected', row.document_id);
    config.store.db
      .prepare('INSERT INTO operations_audit(target,actor,action,reason,at) VALUES(?,?,?,?,?)')
      .run(row.document_id, actor, 'document_' + action, comment, now);
    completeRun?.();
    return {
      status: 200,
      data: {
        state: action === 'approve' ? 'approved' : 'rejected',
        version: row.version + 1,
        leadApprovalUnchanged: true,
      },
    };
  });
}
async function confirmObservation(
  row: ReviewRow,
  observation: WorkflowObservation,
  config: Config,
  clock: () => string,
  ledger: RunLedger,
) {
  if (observation.workflowRunId !== row.workflow_run_id) throw Error('DIFY_REVIEW_RUN_MISMATCH');
  if (observation.state === 'succeeded' && observation.outputs?.timeout === 'human') {
    config.store.transaction(() => {
      const changed = config.store.db
        .prepare(
          "UPDATE content_reviews SET state='expired',version=version+1 WHERE id=? AND version=? AND state=?",
        )
        .run(row.id, row.version, row.state);
      if (!changed.changes) throw Error('REVIEW_CHANGED');
      config.store.db
        .prepare("UPDATE workspace_documents SET state='extracted' WHERE id=?")
        .run(row.document_id);
      if (row.run_id)
        ledger.finish(
          row.run_id,
          'failed',
          clock(),
          { run: observation },
          'HUMAN_TIMEOUT',
          'paused',
        );
    });
    return { status: 409, data: { error: 'HUMAN_TIMEOUT' } };
  }
  const expected = row.intended_action === 'approve' ? 'approved_comment' : 'review_comment';
  if (
    observation.state !== 'succeeded' ||
    !row.intended_action ||
    observation.outputs?.[expected] !== submittedComment(row)
  )
    throw Error('DIFY_REVIEW_OUTCOME_UNCONFIRMED');
  const result = finish(
    row,
    config,
    clock(),
    row.intended_action,
    row.reviewer!,
    row.comment!,
    row.proposed,
    () => {
      if (row.run_id)
        ledger.finish(row.run_id, 'succeeded', clock(), { run: observation }, undefined, 'paused');
    },
  );
  return result;
}
export async function decideDocumentReview(
  id: string,
  raw: unknown,
  principal: Credential,
  config: Config,
  clock: () => string,
  ledger: RunLedger,
) {
  const input = Decision.parse(raw),
    now = clock();
  const row = config.store.transaction(() => {
    const row = load(config, id);
    if (row.version !== input.version || row.state !== 'pending' || row.expires_at <= now)
      throw new DomainError('REVIEW_STATE', 'Controle is gewijzigd, verlopen of al afgehandeld.');
    let corrected;
    try {
      corrected = validateDocument(input.corrected ?? JSON.parse(row.proposed), row.source);
    } catch {
      throw new DomainError(
        'DOCUMENT_CITATION',
        'Een waarde of citaat is niet bevestigd in de brontekst.',
      );
    }
    row.proposed = JSON.stringify(corrected);
    if (row.form_token) {
      options(row, config);
      config.store.db
        .prepare(
          "UPDATE content_reviews SET state='submitting',version=version+1,intended_action=?,reviewer=?,comment=?,proposed=? WHERE id=? AND version=?",
        )
        .run(input.action, principal.subject, input.comment, row.proposed, id, row.version);
      row.state = 'submitting';
      row.version++;
      row.intended_action = input.action;
      row.reviewer = principal.subject;
      row.comment = input.comment;
    }
    return row;
  });
  if (!row.form_token)
    return finish(row, config, now, input.action, principal.subject, input.comment, row.proposed);
  try {
    await submitHumanForm(
      row.form_token,
      input.action,
      submittedComment(row),
      options(row, config),
    );
    return await confirmObservation(
      row,
      await observeWorkflow(options(row, config), { workflowRunId: row.workflow_run_id! }),
      config,
      clock,
      ledger,
    );
  } catch {
    config.store.db
      .prepare(
        "UPDATE content_reviews SET state='submission_unknown' WHERE id=? AND state='submitting' AND version=?",
      )
      .run(id, row.version);
    return {
      status: 202,
      data: {
        state: 'submission_unknown',
        version: row.version,
        leadApprovalUnchanged: true,
        message: 'Provideruitkomst nog niet bevestigd. Stem de run af vóór een nieuwe beoordeling.',
      },
    };
  }
}
export async function reconcileDocumentReview(
  id: string,
  raw: unknown,
  principal: Credential,
  config: Config,
  clock: () => string,
  ledger: RunLedger,
) {
  const input = z.object({ version: z.number().int().positive() }).strict().parse(raw);
  const row = load(config, id);
  if (
    row.version !== input.version ||
    !['submitting', 'submission_unknown'].includes(row.state) ||
    !row.form_token ||
    !row.workflow_run_id
  )
    throw new DomainError('REVIEW_STATE', 'Geen onbekende provideruitkomst voor deze versie.');
  config.store.db
    .prepare('INSERT INTO operations_audit(target,actor,action,reason,at) VALUES(?,?,?,?,?)')
    .run(
      row.document_id,
      principal.subject,
      'document_reconcile',
      'Providerstatus opgevraagd; geen tweede formulierinzending.',
      clock(),
    );
  try {
    return await confirmObservation(
      row,
      await observeWorkflow(options(row, config), { workflowRunId: row.workflow_run_id }),
      config,
      clock,
      ledger,
    );
  } catch {
    return {
      status: 202,
      data: { state: row.state, version: row.version, leadApprovalUnchanged: true },
    };
  }
}
