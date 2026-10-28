import { z } from 'zod';
import { difyBaseUrl, runDifyWorkflow, type DifyConfig } from './dify';

const id = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[\w-]+$/);
const Event = z.object({
  event: z.string(),
  workflow_run_id: id.optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});
export type WorkflowObservation = {
  state: 'paused' | 'succeeded' | 'failed' | 'stopped';
  workflowRunId: string;
  formToken?: string;
  validatedProposal?: string;
  outputs?: Record<string, unknown>;
  totalTokens?: number;
};
function options(config: DifyConfig) {
  if (!config.user) throw Error('DIFY_USER_REQUIRED');
  return { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' };
}
// Read documented SSE frames only. Never persist raw event streams or form bearer tokens in traces.
export async function observeWorkflow(
  config: DifyConfig,
  request: { inputs: Record<string, unknown> } | { workflowRunId: string },
  fetcher: typeof fetch = fetch,
): Promise<WorkflowObservation> {
  const headers = options(config),
    base = difyBaseUrl(config.baseUrl);
  const resume = 'workflowRunId' in request;
  const response = await fetcher(
    resume
      ? `${base}/v1/workflow/${id.parse(request.workflowRunId)}/events?${new URLSearchParams({ user: config.user!, include_state_snapshot: 'true' })}`
      : `${base}/v1/workflows/run`,
    {
      method: resume ? 'GET' : 'POST',
      headers,
      ...(resume
        ? {}
        : {
            body: JSON.stringify({
              inputs: request.inputs,
              response_mode: 'streaming',
              user: config.user,
            }),
          }),
      signal: AbortSignal.timeout(config.timeoutMs ?? 30000),
    },
  );
  if (!response.ok) throw Error(`DIFY_STREAM_HTTP_${response.status}`);
  if (!response.headers.get('content-type')?.includes('text/event-stream'))
    throw Error('DIFY_SSE_REQUIRED');
  const reader = response.body?.getReader();
  if (!reader) throw Error('DIFY_EMPTY_STREAM');
  const decoder = new TextDecoder();
  let buffered = '',
    size = 0,
    workflowRunId = '',
    validatedProposal: string | undefined;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) throw Error('DIFY_STREAM_INCOMPLETE');
      size += value.byteLength;
      if (size > 1048576) throw Error('DIFY_STREAM_TOO_LARGE');
      buffered = (buffered + decoder.decode(value, { stream: true })).replace(/\r\n/g, '\n');
      let separator: number;
      while ((separator = buffered.indexOf('\n\n')) !== -1) {
        const frame = buffered.slice(0, separator);
        buffered = buffered.slice(separator + 2);
        const data = frame
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trimStart())
          .join('\n');
        if (!data) continue;
        const event = Event.parse(JSON.parse(data)),
          detail = event.data ?? {};
        if (event.workflow_run_id) workflowRunId = event.workflow_run_id;
        if (event.event === 'node_finished' && detail.node_id === 'validate') {
          const outputs = z.object({ result: z.string().max(20000) }).parse(detail.outputs);
          validatedProposal = outputs.result;
        }
        if (event.event === 'human_input_required')
          return {
            state: 'paused',
            workflowRunId: id.parse(workflowRunId),
            formToken: id.parse(detail.form_token),
            validatedProposal,
          };
        if (event.event === 'error') throw Error('DIFY_WORKFLOW_REJECTED');
        if (event.event === 'workflow_finished') {
          const final = z
            .object({
              status: z.enum(['succeeded', 'failed', 'stopped']),
              outputs: z.record(z.string(), z.unknown()).nullish(),
              total_tokens: z.number().int().nonnegative().optional(),
            })
            .parse(detail);
          return {
            state: final.status,
            workflowRunId: id.parse(workflowRunId),
            outputs: final.outputs ?? {},
            totalTokens: final.total_tokens,
          };
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}

async function jsonResponse(response: Response) {
  if (!response.ok) throw Error(`DIFY_FORM_HTTP_${response.status}`);
  const reader = response.body?.getReader();
  if (!reader) throw Error('DIFY_FORM_EMPTY');
  let size = 0,
    text = '';
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) throw Error('DIFY_FORM_TOO_LARGE');
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return JSON.parse(text + decoder.decode());
}
export async function getHumanForm(
  formToken: string,
  config: DifyConfig,
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher(
    `${difyBaseUrl(config.baseUrl)}/v1/form/human_input/${id.parse(formToken)}`,
    { headers: options(config), signal: AbortSignal.timeout(10000) },
  );
  return z
    .object({
      expiration_time: z.number().int().positive(),
      user_actions: z.array(z.object({ id: z.string() })),
    })
    .passthrough()
    .parse(await jsonResponse(response));
}
export async function submitHumanForm(
  formToken: string,
  action: 'approve' | 'reject',
  comment: string,
  config: DifyConfig,
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher(
    `${difyBaseUrl(config.baseUrl)}/v1/form/human_input/${id.parse(formToken)}`,
    {
      method: 'POST',
      headers: options(config),
      body: JSON.stringify({ inputs: { comment }, action, user: config.user }),
      signal: AbortSignal.timeout(15000),
    },
  );
  await jsonResponse(response);
}
export async function extractFileDify(
  filename: string,
  bytes: Buffer,
  config: DifyConfig,
  fetcher: typeof fetch = fetch,
) {
  if (bytes.length > 2097152 || !bytes.length) throw Error('DIFY_FILE_SIZE');
  const form = new FormData();
  form.append('user', config.user ?? 'duin-dorp-demo');
  form.append('file', new Blob([new Uint8Array(bytes)]), filename);
  const response = await fetcher(`${difyBaseUrl(config.baseUrl)}/v1/files/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}` },
    body: form,
    signal: AbortSignal.timeout(20000),
  });
  const uploaded = z.object({ id: id }).parse(await jsonResponse(response));
  const result = await runDifyWorkflow(
    {
      operation: 'extract',
      document_text: '',
      document_file: {
        type: 'document',
        transfer_method: 'local_file',
        upload_file_id: uploaded.id,
      },
    },
    config,
    'blocking',
    fetcher,
  );
  return {
    source: z.string().min(20).max(12000).parse(result.outputs.source),
    run: { workflowRunId: result.workflowRunId, totalTokens: result.totalTokens },
  };
}
