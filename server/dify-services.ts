import { createHash } from 'node:crypto';
import type { Lead, Listing } from '../src/domain';
import { validateExtraction, type Intake } from '../src/domain';
import {
  minimiseDocument,
  validateAssistance,
  validateDocument,
  type ContextFact,
} from '../src/dify-contracts';
import { runDifyWorkflow, runDifyAgent, type DifyConfig, type DifyWorkflowRun } from './dify';

export function runMetadata(run: DifyWorkflowRun) {
  return {
    workflowRunId: run.workflowRunId,
    workflowId: run.workflowId,
    taskId: run.taskId,
    elapsedTime: run.elapsedTime,
    totalTokens: run.totalTokens,
  };
}
function parsedOutput(outputs: Record<string, unknown>) {
  if (typeof outputs.result !== 'string') throw new Error('DIFY_RESULT_MISSING');
  try {
    return JSON.parse(outputs.result);
  } catch {
    throw new Error('DIFY_RESULT_INVALID_JSON');
  }
}
export async function analyseDify(
  input: Intake,
  config: DifyConfig,
  fetcher: typeof fetch = fetch,
) {
  const run = await runDifyWorkflow({ message: input.message }, config, 'blocking', fetcher);
  return {
    extraction: validateExtraction(parsedOutput(run.outputs), input.message),
    run: runMetadata(run),
  };
}
export function caseFacts(lead: Lead, listings: Listing[]): ContextFact[] {
  const listing = listings.find((x) => x.id === lead.extraction.reference);
  const facts: ContextFact[] = [
    { id: 'F1', text: `Het doel van de aanvraag is ${lead.extraction.intent}.` },
    {
      id: 'F2',
      text: `De werkstatus is ${lead.status}; er zijn ${lead.attempts} CRM-pogingen geregistreerd.`,
    },
    {
      id: 'F3',
      text: 'Een medewerker beslist over klantcommunicatie. De assistent mag geen acties uitvoeren.',
    },
  ];
  if (listing)
    facts.push({
      id: 'F4',
      text: `Pand ${listing.id} heeft catalogusstatus ${listing.status === 'sold' ? 'verkocht' : 'beschikbaar'}.`,
    });
  else
    facts.push({
      id: 'F4',
      text: 'Er is geen bevestigde pandkoppeling in de aangeleverde catalogus.',
    });
  lead.reasons.forEach((reason, i) => facts.push({ id: `R${i + 1}`, text: reason }));
  return facts;
}
export async function assistDify(
  lead: Lead,
  listings: Listing[],
  question: string,
  config: DifyConfig,
  subject: string,
  fetcher: typeof fetch = fetch,
) {
  const facts = caseFacts(lead, listings);
  const user = `portfolio-${createHash('sha256').update(subject).digest('hex').slice(0, 20)}`;
  const response = await runDifyAgent(
    question,
    { ...config, user },
    { inputs: { case_context: JSON.stringify({ mode: 'application-case', facts }) }, fetcher },
  );
  let parsed: unknown;
  try {
    parsed = JSON.parse(response.answer);
  } catch {
    throw new Error('DIFY_ASSISTANT_INVALID_JSON');
  }
  return {
    proposal: validateAssistance(parsed, facts),
    sourceFacts: facts,
    run: { conversationId: response.conversationId, messageId: response.messageId },
    requires_human: true as const,
  };
}
export async function reviewDocumentDify(
  documentText: string,
  config: DifyConfig,
  fetcher: typeof fetch = fetch,
) {
  const source = minimiseDocument(documentText);
  const response = await runDifyWorkflow({ document_text: source }, config, 'blocking', fetcher);
  return {
    review: validateDocument(parsedOutput(response.outputs), source),
    redactedSource: source,
    minimisationApplied: source !== documentText,
    run: runMetadata(response),
    requires_human: true as const,
  };
}
