import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractDify, runDifyAgent, runDifyWorkflow } from '../server/dify';

const input = {
  eventId: 'evt-dify-1',
  name: 'Robin Demo',
  email: 'robin@example.com',
  message: 'Ik wil DD-204 graag bezoeken.',
  channel: 'website' as const,
};
test('streaming is explicitly unsupported; JSON parser never consumes SSE as JSON', async () => {
  await assert.rejects(
    () => runDifyWorkflow({}, { apiKey: 'app-test' }, 'streaming'),
    /DIFY_STREAMING_UNSUPPORTED/,
  );
});

test('Dify adapter validates a structured workflow result', async () => {
  const extraction = await extractDify(
    input,
    { apiKey: 'app-test' },
    async () =>
      new Response(
        JSON.stringify({
          data: {
            status: 'succeeded',
            outputs: { intent: 'visit', reference: 'DD-204', evidence: 'bezoeken' },
          },
        }),
        { status: 200 },
      ),
  );
  assert.deepEqual(extraction, { intent: 'visit', reference: 'DD-204', evidence: 'bezoeken' });
});

test('Dify client exposes safe run metadata without response secrets', async () => {
  const run = await runDifyWorkflow(
    { message: input.message },
    { apiKey: 'app-test' },
    'blocking',
    async () =>
      new Response(
        JSON.stringify({
          task_id: 'task-1',
          workflow_run_id: 'run-1',
          data: {
            status: 'succeeded',
            workflow_id: 'workflow-1',
            elapsed_time: 0.42,
            total_tokens: 31,
            outputs: { intent: 'visit' },
          },
        }),
        { status: 200 },
      ),
  );
  assert.deepEqual(run, {
    outputs: { intent: 'visit' },
    workflowRunId: 'run-1',
    taskId: 'task-1',
    workflowId: 'workflow-1',
    elapsedTime: 0.42,
    totalTokens: 31,
  });

  test('Dify agent adapter keeps conversation continuity without adding tools', async () => {
    const run = await runDifyAgent(
      'Leg uit waarom deze aanvraag handmatige controle nodig heeft.',
      {
        apiKey: 'app-test',
      },
      {
        conversationId: 'conversation-1',
        fetcher: async (_url, request) => {
          const body = JSON.parse(String(request?.body));
          assert.equal(body.conversation_id, 'conversation-1');
          assert.equal(body.response_mode, 'blocking');
          return new Response(
            JSON.stringify({
              answer: 'De cataloguscontrole ontbreekt.',
              conversation_id: 'conversation-1',
              message_id: 'message-1',
            }),
            { status: 200 },
          );
        },
      },
    );
    assert.equal(run.answer, 'De cataloguscontrole ontbreekt.');
    assert.equal(run.conversationId, 'conversation-1');
  });
});

test('Dify adapter accepts a JSON result field but rejects invented evidence', async () => {
  await assert.rejects(
    extractDify(
      input,
      { apiKey: 'app-test' },
      async () =>
        new Response(
          JSON.stringify({
            data: {
              status: 'succeeded',
              outputs: {
                result: JSON.stringify({
                  intent: 'visit',
                  reference: 'DD-204',
                  evidence: 'zaterdag',
                }),
              },
            },
          }),
          { status: 200 },
        ),
    ),
    (error: unknown) => error instanceof Error && (error as { code?: string }).code === 'EVIDENCE',
  );
});

test('Dify adapter surfaces upstream failures without exposing the key', async () => {
  await assert.rejects(
    extractDify(
      input,
      { apiKey: 'secret-test-key' },
      async () => new Response('nope', { status: 502 }),
    ),
    /DIFY_HTTP_502/,
  );
});
