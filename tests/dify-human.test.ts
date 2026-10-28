import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { observeWorkflow, extractFileDify } from '../server/dify-human';
import { Store } from '../server/store';
import { makeServer } from '../server/app';
import { catalog } from '../src/seed';
const time = '2026-10-28T12:00:00.000Z';
const source =
  'Referentie: DD-204\nGemeente: Oudenburg\nStatus: beschikbaar\nVraagprijs: 389000 EUR';
const proposal = {
  document_type: 'property-sheet',
  facts: [{ field: 'reference', value: 'DD-204', quote: 'Referentie: DD-204' }],
  missing_fields: ['price', 'city', 'status'],
  risks: ['Controle door medewerker vereist.'],
  requires_human: true,
};
const events = [
  {
    event: 'node_finished',
    workflow_run_id: 'run-1',
    data: { node_id: 'validate', outputs: { result: JSON.stringify(proposal) } },
  },
  {
    event: 'human_input_required',
    workflow_run_id: 'run-1',
    data: { form_token: 'private-form-token' },
  },
];
function sse(items: unknown[]) {
  return items.map((item) => 'data: ' + JSON.stringify(item) + '\r\n\r\n').join('');
}
test('Human Input SSE parser handles split CRLF frames, refuses non-SSE and requires complete outcomes', async () => {
  const encoded = new TextEncoder().encode('event: ping\r\n\r\n' + sse(events));
  const fetcher = (async (_url, init) => {
    assert.equal(JSON.parse(String(init?.body)).user, 'scoped-user');
    return new Response(
      new ReadableStream({
        start(controller) {
          for (const byte of encoded) controller.enqueue(new Uint8Array([byte]));
          controller.close();
        },
      }),
      { headers: { 'Content-Type': 'text/event-stream' } },
    );
  }) as typeof fetch;
  const result = await observeWorkflow(
    { apiKey: 'test', user: 'scoped-user' },
    { inputs: { operation: 'human' } },
    fetcher,
  );
  assert.equal(result.state, 'paused');
  assert.equal(result.workflowRunId, 'run-1');
  assert.equal(result.validatedProposal, JSON.stringify(proposal));
  await assert.rejects(
    observeWorkflow(
      { apiKey: 'test', user: 'scoped-user' },
      { inputs: {} },
      async () => new Response('{}'),
    ),
    /SSE_REQUIRED/,
  );
  await assert.rejects(
    observeWorkflow(
      { apiKey: 'test', user: 'scoped-user' },
      { inputs: {} },
      async () =>
        new Response('event: ping\n\n', { headers: { 'Content-Type': 'text/event-stream' } }),
    ),
    /INCOMPLETE/,
  );
});
test('Dify document upload uses the same user and extract-only file input, validates returned text', async () => {
  let calls = 0;
  const fetcher = (async (url, init) => {
    calls++;
    if (calls === 1) {
      assert.match(String(url), /\/v1\/files\/upload$/);
      const body = init?.body as FormData;
      assert.equal(body.get('user'), 'file-user');
      assert.equal((body.get('file') as File).name, 'fiche.txt');
      return Response.json({ id: 'file-1' });
    }
    const payload = JSON.parse(String(init?.body));
    assert.equal(payload.user, 'file-user');
    assert.equal(payload.inputs.operation, 'extract');
    assert.equal(payload.inputs.document_file.upload_file_id, 'file-1');
    return Response.json({
      workflow_run_id: 'file-run',
      data: { status: 'succeeded', outputs: { source }, total_tokens: 0 },
    });
  }) as typeof fetch;
  const result = await extractFileDify(
    'fiche.txt',
    Buffer.from(source),
    { apiKey: 'test', user: 'file-user' },
    fetcher,
  );
  assert.equal(result.source, source);
  assert.equal(result.run.totalTokens, 0);
  assert.equal(calls, 2);
});
for (const outcome of ['approve', 'reject', 'timeout'] as const) {
  test(`native review reconciles ${outcome} after unknown submit outcome without approving the lead`, async () => {
    let posts = 0,
      submitted = '',
      action = '';
    const provider = createServer(async (req, res) => {
      if (req.url === '/v1/workflows/run') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        res.end(sse(events));
        return;
      }
      if (req.url === '/v1/form/human_input/private-form-token') {
        if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              expiration_time: Date.parse(time) / 1000 + 3600,
              user_actions: [{ id: 'approve' }, { id: 'reject' }],
            }),
          );
          return;
        }
        let body = '';
        for await (const chunk of req) body += chunk;
        const payload = JSON.parse(body);
        assert.match(payload.user, /^document-/);
        submitted = payload.inputs.comment;
        action = payload.action;
        posts++;
        req.socket.destroy();
        return;
      }
      if (req.url?.startsWith('/v1/workflow/run-1/events?')) {
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        res.end(
          sse([
            {
              event: 'workflow_finished',
              workflow_run_id: 'run-1',
              data: {
                status: 'succeeded',
                outputs:
                  outcome === 'timeout'
                    ? { timeout: 'human' }
                    : {
                        [action === 'approve' ? 'approved_comment' : 'review_comment']: submitted,
                      },
                total_tokens: 77,
              },
            },
          ]),
        );
        return;
      }
      res.writeHead(404);
      res.end();
    });
    provider.listen(0, '127.0.0.1');
    await once(provider, 'listening');
    const store = new Store();
    const lead = store.ingest(
      {
        eventId: 'human-intake',
        name: 'Robin Demo',
        email: 'robin@example.com',
        channel: 'website',
        message: 'Ik wil DD-204 bezoeken.',
      },
      catalog(time),
      time,
    ).lead;
    const server = makeServer({
      store,
      listings: catalog(time),
      credentials: [
        { token: 'review', subject: 'reviewer', roles: ['reviewer'] },
        { token: 'read', subject: 'reader', roles: ['reader'] },
      ],
      webhookSecret: 'test',
      difyDocumentKey: 'test',
      difyBaseUrl: `http://127.0.0.1:${(provider.address() as { port: number }).port}`,
      now: () => time,
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const request = (path: string, body?: unknown, token = 'review') =>
      fetch(base + path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    try {
      const document = await (
        await request('/api/workspace/documents', {
          leadId: lead.id,
          filename: 'fiche.txt',
          base64: Buffer.from(source).toString('base64'),
        })
      ).json();
      const analysed = await request(`/api/workspace/documents/${document.id}/analyse`, {
        nativeHuman: true,
      });
      assert.equal(analysed.status, 200);
      const result = await analysed.json();
      const snapshot = await (await request('/api/workspace', undefined, 'read')).json();
      assert.equal(snapshot.runs[0].state, 'paused');
      assert.equal(snapshot.reviews[0].native_human, 1);
      assert.doesNotMatch(JSON.stringify(snapshot), /private-form-token/);
      const unknown = await request(`/api/workspace/reviews/${result.reviewId}`, {
        version: 1,
        action: outcome === 'reject' ? 'reject' : 'approve',
        comment: 'Fictieve bron handmatig gecontroleerd.',
      });
      assert.equal(unknown.status, 202);
      assert.equal((await unknown.json()).state, 'submission_unknown');
      assert.equal(
        (
          await request(`/api/workspace/reviews/${result.reviewId}`, {
            version: 1,
            action: 'approve',
            comment: 'Niet opnieuw indienen.',
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await request(
            `/api/workspace/reviews/${result.reviewId}/reconcile`,
            { version: 2 },
            'read',
          )
        ).status,
        403,
      );
      const reconciled = await request(`/api/workspace/reviews/${result.reviewId}/reconcile`, {
        version: 2,
      });
      assert.equal(reconciled.status, outcome === 'timeout' ? 409 : 200);
      const confirmation = await reconciled.json();
      if (outcome === 'timeout') assert.equal(confirmation.error, 'HUMAN_TIMEOUT');
      else assert.equal(confirmation.state, outcome === 'approve' ? 'approved' : 'rejected');
      assert.equal(posts, 1);
      assert.equal(store.get(lead.id).status, lead.status);
      const final = await (await request('/api/workspace', undefined, 'read')).json();
      assert.equal(final.runs[0].state, outcome === 'timeout' ? 'failed' : 'succeeded');
      assert.equal(
        final.documents[0].state,
        outcome === 'timeout' ? 'extracted' : outcome === 'approve' ? 'reviewed' : 'rejected',
      );
      assert.equal(final.budget.actualTokens, 77);
    } finally {
      server.close();
      provider.close();
      store.close();
    }
  });
}
