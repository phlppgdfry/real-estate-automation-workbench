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

/** Runs a published Dify Workflow in blocking mode; Dify never receives CRM tools. */
export async function extractDify(
  input: Intake,
  config: DifyConfig,
  fetcher: typeof fetch = fetch,
): Promise<Extraction> {
  const run = await runDifyWorkflow({ message: input.message }, config, 'blocking', fetcher);
  return validateExtraction(outputValue(run.outputs), input.message);
}
