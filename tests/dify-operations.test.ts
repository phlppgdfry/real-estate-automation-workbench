import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { once } from 'node:events';
import YAML from 'yaml';
import { difyBaseUrl, runDifyAgent, runDifyWorkflow } from '../server/dify';
import { assistDify, caseFacts, reviewDocumentDify } from '../server/dify-services';
import { validateAssistance, validateDocument, minimiseDocument } from '../src/dify-contracts';
import { createLead } from '../src/domain';
import { catalog } from '../src/seed';
import { Store } from '../server/store';
import { makeServer } from '../server/app';
const now = '2026-10-26T10:00:00Z';
const input = {
  eventId: 'case-dify',
  name: 'Private Name',
  email: 'private@example.com',
  channel: 'website' as const,
  message: 'Ik wil DD-209 bezoeken.',
};
const lead = createLead(input, catalog(now), now);
const proposal = {
  summary: 'Verkocht pand.',
  facts: [{ source_id: 'F4', quote: 'Pand DD-209 heeft catalogusstatus verkocht.' }],
  risks: [],
  next_action: 'Medewerker controleert de status.',
  requires_human: true,
};
test('Dify URL normalization prevents double v1 and rejects credential-bearing or insecure URLs', () => {
  assert.equal(difyBaseUrl('https://api.dify.ai/v1/'), 'https://api.dify.ai');
  for (const url of [
    'https://user:secret@example.com',
    'https://example.com?key=secret',
    'http://example.com',
  ])
    assert.throws(() => difyBaseUrl(url));
  assert.equal(difyBaseUrl('http://127.0.0.1:7000/v1'), 'http://127.0.0.1:7000');
});
test('bounded provider parser refuses oversized output and times out safely', async () => {
  await assert.rejects(
    runDifyWorkflow(
      {},
      { apiKey: 'test' },
      'blocking',
      async () => new Response(' '.repeat(262145)),
    ),
    /DIFY_RESPONSE_TOO_LARGE/,
  );
  await assert.rejects(
    runDifyAgent(
      'test',
      { apiKey: 'test', timeoutMs: 100 },
      {
        fetcher: async (_u, r) =>
          new Promise((_resolve, reject) => {
            r?.signal?.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError')),
            );
          }),
      },
    ),
    /DIFY_AGENT_TIMEOUT/,
  );
});
test('assistant receives trusted facts without contact details or the raw enquiry, with stateless scoped user', async () => {
  const facts = caseFacts(lead, catalog(now));
  assert.doesNotMatch(JSON.stringify(facts), /Private Name|private@example|Ik wil/);
  const result = await assistDify(
    lead,
    catalog(now),
    'Wat moet een medewerker doen?',
    { apiKey: 'test' },
    'reviewer-1',
    async (_u, r) => {
      const request = JSON.parse(String(r?.body));
      assert.ok(request.inputs.case_context);
      assert.equal(request.conversation_id, undefined);
      assert.match(request.user, /^portfolio-[a-f0-9]{20}$/);
      return new Response(
        JSON.stringify({ answer: JSON.stringify(proposal), message_id: 'msg-1' }),
      );
    },
  );
  assert.equal(result.proposal.requires_human, true);
  assert.throws(() =>
    validateAssistance({ ...proposal, facts: [{ source_id: 'F4', quote: 'beschikbaar' }] }, facts),
  );
  assert.throws(() => validateAssistance({ ...proposal, requires_human: false }, facts));
});
test('document contact minimisation occurs before provider call, independent source guard rejects hallucinations', async () => {
  const source =
    'Referentie: DD-204\nEPC: 158 kWh/m²/jaar\nContact: private@example.com\nTelefoon: +32 499 12 34 56';
  const review = {
    document_type: 'property-sheet',
    facts: [{ field: 'reference', value: 'DD-204', quote: 'Referentie: DD-204' }],
    missing_fields: ['price'],
    risks: [],
    requires_human: true,
  };
  const result = await reviewDocumentDify(source, { apiKey: 'test' }, async (_u, r) => {
    const text = JSON.parse(String(r?.body)).inputs.document_text;
    assert.doesNotMatch(text, /private@example|499 12/);
    return new Response(
      JSON.stringify({
        data: { status: 'succeeded', outputs: { result: JSON.stringify(review) } },
      }),
    );
  });
  assert.equal(result.minimisationApplied, true);
  assert.match(result.redactedSource, /\[EMAIL\]/);
  assert.throws(() =>
    validateDocument(
      { ...review, facts: [{ field: 'price', value: '400000', quote: 'Price 400000' }] },
      source,
    ),
  );
  assert.throws(() => validateDocument({ ...review, missing_fields: ['reference'] }, source));
  assert.equal(minimiseDocument('Prijs: 389000 EUR\nEPC: 158'), 'Prijs: 389000 EUR\nEPC: 158');
});
function py(file: string, args: unknown) {
  return JSON.parse(
    execFileSync(
      'python3',
      [
        '-c',
        `import json,sys\nns={}\nexec(open(sys.argv[1]).read(),ns)\nprint(json.dumps(ns['main'](**json.loads(sys.argv[2]))))`,
        `dify/code/${file}.py`,
        JSON.stringify(args),
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    ),
  );
}
test('actual Python guards handle empty optional context and enforce citations and deterministic human review', () => {
  const context = py('prepare_context', { case_context: null }).context;
  assert.equal(JSON.parse(context).facts[0].id, 'F1');
  const raw = {
    summary: 'Verkocht.',
    facts: [{ source_id: 'F1', quote: 'Pand DD-209 is verkocht.' }],
    risks: [],
    next_action: 'Controleer de status.',
  };
  assert.equal(
    JSON.parse(py('validate_assistant', { model_text: JSON.stringify(raw), context }).result)
      .requires_human,
    true,
  );
  assert.throws(() =>
    py('validate_assistant', {
      model_text: JSON.stringify({
        ...raw,
        facts: [{ source_id: 'F1', quote: 'Pand is beschikbaar.' }],
      }),
      context,
    }),
  );
  assert.throws(() =>
    py('validate_lead', {
      model_text: JSON.stringify({ intent: 'visit', reference: 'DD-999', evidence: 'bezoeken' }),
      message: 'DD-204 bezoeken',
    }),
  );
  const doc = {
    document_type: 'property-sheet',
    facts: [{ field: 'reference', value: 'DD-204', quote: 'Referentie: DD-204' }],
    missing_fields: [],
    risks: [],
  };
  assert.equal(
    JSON.parse(
      py('validate_document', { model_text: JSON.stringify(doc), source: 'Referentie: DD-204' })
        .result,
    ).requires_human,
    true,
  );
});
test('importable DSL has no tools/secrets and embedded code equals tested source', () => {
  for (const file of ['lead-intake', 'operations-assistant', 'document-review']) {
    const doc = YAML.parse(readFileSync(`dify/apps/${file}.yml`, 'utf8'));
    assert.equal(doc.version, '0.7.0');
    assert.deepEqual(doc.workflow.environment_variables, []);
    for (const node of doc.workflow.graph.nodes) {
      if (node.type === 'custom-note') {
        assert.ok(JSON.parse(node.data.text).root.children.length >= 2);
        assert.equal(
          doc.workflow.graph.edges.some(
            (edge: { source: string; target: string }) =>
              edge.source === node.id || edge.target === node.id,
          ),
          false,
        );
        continue;
      }
      const allowed = ['start', 'code', 'llm', 'end', 'answer'];
      if (file === 'document-review')
        allowed.push('if-else', 'document-extractor', 'variable-aggregator', 'human-input');
      assert.ok(allowed.includes(node.data.type), `Unexpected executable node: ${node.data.type}`);
      if (node.data.type === 'human-input') {
        assert.ok(node.data.delivery_methods.length > 0);
        assert.ok(
          node.data.delivery_methods.every((method: { type: string }) => method.type === 'webapp'),
        );
        assert.deepEqual(node.data.user_actions.map((action: { id: string }) => action.id).sort(), [
          'approve',
          'reject',
        ]);
        assert.equal(node.data.timeout, 1);
        assert.equal(node.data.timeout_unit, 'hour');
      }
      if (node.data.type === 'llm') assert.equal(node.data.structured_output_enabled, true);
      if (node.data.type === 'code') {
        const files: Record<string, string> =
          file === 'lead-intake'
            ? { validate: 'validate_lead' }
            : file === 'operations-assistant'
              ? { prepare: 'prepare_context', validate: 'validate_assistant' }
              : { redact: 'redact_document', validate: 'validate_document' };
        assert.equal(node.data.code, readFileSync(`dify/code/${files[node.id]}.py`, 'utf8'));
      }
    }
  }
});
test('Dify routes require reviewer role, expose only availability and do not mutate the queue on failure', async () => {
  const store = new Store();
  const server = makeServer({
    store,
    credentials: [
      { token: 'read', subject: 'r', roles: ['reader'] },
      { token: 'review', subject: 'v', roles: ['reviewer'] },
    ],
    webhookSecret: 'x',
    listings: catalog(now),
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    for (const [token, status] of [
      ['', 401],
      ['read', 403],
      ['review', 503],
    ] as const) {
      const res = await fetch(`${base}/api/dify/compare`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: 'Vergelijk fictieve panden',
          city: 'Oudenburg',
          maxPrice: 390000,
          minBedrooms: 3,
        }),
      });
      assert.equal(res.status, status);
    }
    const res = await fetch(`${base}/api/dify/status`, {
      headers: { Authorization: 'Bearer read' },
    });
    assert.deepEqual(await res.json(), {
      analysis: false,
      assistant: false,
      document: false,
      comparison: false,
      requiresHuman: true,
    });
    assert.equal(store.all().length, 0);
  } finally {
    server.close();
    store.close();
  }
});

// A partial model result must not silently present an incomplete property sheet as complete.
test('document completeness is derived independently in Python and TypeScript', () => {
  const raw = {
    document_type: 'property-sheet',
    facts: [{ field: 'reference', value: 'DD-204', quote: 'Referentie: DD-204' }],
    missing_fields: [],
    risks: [],
  };
  const expected = ['city', 'price', 'status'];
  const fromPython = JSON.parse(
    py('validate_document', { model_text: JSON.stringify(raw), source: 'Referentie: DD-204' })
      .result,
  );
  assert.deepEqual(fromPython.missing_fields, expected);
  assert.deepEqual(
    validateDocument({ ...raw, requires_human: true }, 'Referentie: DD-204').missing_fields,
    expected,
  );
});

test('canvas documentation covers each executable node and has no overlapping note panels', () => {
  const guide = JSON.parse(readFileSync('dify/canvas/guide.json', 'utf8'));
  for (const app of guide.apps) {
    const doc = YAML.parse(readFileSync(`dify/apps/${app.id}.yml`, 'utf8'));
    const nodes = doc.workflow.graph.nodes;
    assert.equal(new Set(nodes.map((n: any) => n.id)).size, nodes.length);
    assert.deepEqual(
      nodes
        .filter((n: any) => n.type !== 'custom-note')
        .map((n: any) => n.id)
        .sort(),
      app.steps.map((s: any) => s.id).sort(),
    );
    for (const step of app.steps)
      assert.equal(nodes.find((n: any) => n.id === step.id).data.desc, step.description);
    const notes = nodes.filter((n: any) => n.type === 'custom-note');
    assert.equal(notes.length, 7);
    for (let i = 0; i < notes.length; i++)
      for (let j = i + 1; j < notes.length; j++) {
        const a = notes[i],
          b = notes[j];
        assert.equal(
          a.position.x < b.position.x + b.width &&
            a.position.x + a.width > b.position.x &&
            a.position.y < b.position.y + b.height &&
            a.position.y + a.height > b.position.y,
          false,
        );
      }
  }
});
