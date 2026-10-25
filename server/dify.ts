import { z } from 'zod';
import { validateExtraction, type Extraction, type Intake } from '../src/domain';

const DifyResponseSchema = z
  .object({
    data: z
      .object({
        status: z.literal('succeeded'),
        outputs: z.record(z.string(), z.unknown()),
        id: z.string().optional(),
        workflow_id: z.string().optional(),
        elapsed_time: z.number().optional(),
        total_tokens: z.number().optional(),
      })
      .passthrough(),
    task_id: z.string().optional(),
    workflow_run_id: z.string().optional(),
  })
  .passthrough();

export type DifyConfig = {
  apiKey: string;
  baseUrl?: string;
  user?: string;
  timeoutMs?: number;
};

export type DifyWorkflowRun = {
  outputs: Record<string, unknown>;
  workflowRunId?: string;
  taskId?: string;
  workflowId?: string;
  elapsedTime?: number;
  totalTokens?: number;
};

export type DifyChatRun = {
  answer: string;
  conversationId?: string;
  messageId?: string;
  metadata?: Record<string, unknown>;
};

function endpoint(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/v1/workflows/run`;
}

function outputValue(outputs: Record<string, unknown>): unknown {
  if (outputs.intent !== undefined) return outputs;
  if (typeof outputs.result === 'string') {
    try {
      return JSON.parse(outputs.result);
    } catch {
      throw new Error('DIFY_INVALID_OUTPUT');
    }
  }
  return outputs;
}

export async function runDifyWorkflow(
  inputs: Record<string, unknown>,
  config: DifyConfig,
  mode: 'blocking' | 'streaming' = 'blocking',
  fetcher: typeof fetch = fetch,
): Promise<DifyWorkflowRun> {
  if (mode !== 'blocking') throw new Error('DIFY_STREAMING_UNSUPPORTED');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? 15000);
  try {
    const response = await fetcher(endpoint(config.baseUrl ?? 'https://api.dify.ai'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs,
        response_mode: mode,
        user: config.user ?? 'duin-dorp-demo',
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`DIFY_HTTP_${response.status}`);
    const parsed = DifyResponseSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error('DIFY_INVALID_RESPONSE');
    return {
      outputs: parsed.data.data.outputs,
      workflowRunId: parsed.data.workflow_run_id ?? parsed.data.data.id,
      taskId: parsed.data.task_id,
      workflowId: parsed.data.data.workflow_id,
      elapsedTime: parsed.data.data.elapsed_time,
      totalTokens: parsed.data.data.total_tokens,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('DIFY_TIMEOUT');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function extractDify(
  input: Intake,
  config: DifyConfig,
  fetcher: typeof fetch = fetch,
): Promise<Extraction> {
  const run = await runDifyWorkflow({ message: input.message }, config, 'blocking', fetcher);
  return validateExtraction(outputValue(run.outputs), input.message);
}

export async function runDifyAgent(
  query: string,
  config: DifyConfig,
  options: { conversationId?: string; fetcher?: typeof fetch } = {},
): Promise<DifyChatRun> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs ?? 15000);
  try {
    const response = await (options.fetcher ?? fetch)(
      `${(config.baseUrl ?? 'https://api.dify.ai').replace(/\/+$/, '')}/v1/chat-messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          response_mode: 'blocking',
          user: config.user ?? 'duin-dorp-demo',
          ...(options.conversationId ? { conversation_id: options.conversationId } : {}),
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok) throw new Error(`DIFY_AGENT_HTTP_${response.status}`);
    const parsed = z
      .object({
        answer: z.string(),
        conversation_id: z.string().optional(),
        message_id: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
      .passthrough()
      .safeParse(await response.json());
    if (!parsed.success) throw new Error('DIFY_AGENT_INVALID_RESPONSE');
    return {
      answer: parsed.data.answer,
      conversationId: parsed.data.conversation_id,
      messageId: parsed.data.message_id,
      metadata: parsed.data.metadata,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError')
      throw new Error('DIFY_AGENT_TIMEOUT');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
