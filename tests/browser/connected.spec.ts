import { test, expect } from '@playwright/test';
import { once } from 'node:events';
import { makeServer } from '../../server/app';
import { Store } from '../../server/store';
import { catalog } from '../../src/seed';
let store: Store, server: ReturnType<typeof makeServer>, base: string;
test.beforeAll(async () => {
  store = new Store();
  server = makeServer({
    store,
    listings: catalog(),
    credentials: [
      { token: 'connected-reviewer', subject: 'reviewer', roles: ['reviewer'] },
      { token: 'connected-operator', subject: 'operator', roles: ['operator'] },
    ],
    webhookSecret: 'test',
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
test.afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  store.close();
});
test('connected UI uses real API: durable intake, role switch, analysis, source upload and procedure lookup', async ({
  page,
}) => {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: base + url.pathname + url.search });
    await route.fulfill({ response });
  });
  await page.goto('./');
  await page.getByRole('button', { name: 'Verbonden werkplek', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Persoonlijke sessietoken', exact: true })
    .fill('connected-reviewer');
  await page.getByRole('button', { name: 'Verbinden / vernieuwen', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Fictieve aanvraag ontvangen', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Duurzaam ontvangen', exact: true }).click();
  await expect(page.getByText(/pending · 0 poging/)).toBeVisible();
  await page
    .getByRole('button', { name: 'Analysebatch uitvoeren · operator', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('Deze rol');
  await page
    .getByRole('textbox', { name: 'Persoonlijke sessietoken', exact: true })
    .fill('connected-operator');
  await page.getByRole('button', { name: 'Verbinden / vernieuwen', exact: true }).click();
  await page
    .getByRole('button', { name: 'Analysebatch uitvoeren · operator', exact: true })
    .click();
  await expect(
    page.getByRole('combobox', { name: 'Lokale aanvraag', exact: true }),
  ).not.toHaveValue('');
  await page
    .getByRole('textbox', { name: 'Persoonlijke sessietoken', exact: true })
    .fill('connected-reviewer');
  await page.getByRole('button', { name: 'Verbinden / vernieuwen', exact: true }).click();
  await page.getByLabel('PDF, DOCX, EML, TXT of Markdown').setInputFiles({
    name: 'fictieve-fiche.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(
      'Referentie: DD-204\nGemeente: Oudenburg\nVraagprijs: 389000 EUR\nStatus: beschikbaar\nContact: private@example.com',
    ),
  });
  await page.getByRole('button', { name: 'Toevoegen aan dit dossier', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'fictieve-fiche.txt', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Bron bekijken', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Verbonden dossierwerkplek' })).toContainText(
    '[EMAIL]',
  );
  await page.getByRole('button', { name: 'Zoek in actuele procedures', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Verbonden dossierwerkplek' })).toContainText(
    'SOP-VISIT-NL-2',
  );
  await page.getByRole('combobox', { name: 'Proceduretaal', exact: true }).selectOption('fr');
  await page
    .getByRole('textbox', { name: 'Vraag', exact: true })
    .fill('Pourquoi le bien vendu ne peut pas être visité?');
  await page.getByRole('button', { name: 'Zoek in actuele procedures', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Verbonden dossierwerkplek' })).toContainText(
    'SOP-VISIT-FR-1',
  );
  await page.getByRole('button', { name: 'Zoek via Dify Knowledge', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Benodigde verbinding');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Runmetadata downloaden', exact: true }).click();
  expect((await downloaded).suggestedFilename()).toMatch(/^duin-dorp-runs-.*\.json$/);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    'connected-reviewer',
  );
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('reviewer corrects cited content, rejects fabricated edits, and expired reviews recover without approving a case', async ({
  page,
}) => {
  const now = new Date().toISOString();
  const lead = store.ingest(
    {
      eventId: 'review-browser-case',
      name: 'Robin Demo',
      email: 'demo@example.com',
      channel: 'website',
      message: 'Ik wil DD-204 bezoeken.',
    },
    catalog(now),
    now,
  ).lead;
  const proposal = {
    document_type: 'property-sheet',
    facts: [{ field: 'reference', value: 'DD-204', quote: 'Referentie: DD-204' }],
    missing_fields: ['city', 'price', 'status'],
    risks: [],
    requires_human: true,
  };
  for (const id of ['reviewable', 'expired']) {
    store.db
      .prepare(
        'INSERT INTO workspace_documents(id,lead_id,filename,media_type,sha256,source,state,created_at) VALUES(?,?,?,?,?,?,?,?)',
      )
      .run(
        id,
        lead.id,
        id + '.txt',
        'txt',
        id,
        'Referentie: DD-204\nGemeente: Oudenburg\nVraagprijs: 389000 EUR',
        'awaiting_review',
        now,
      );
    store.db
      .prepare(
        'INSERT INTO content_reviews(id,document_id,state,proposed,created_at,expires_at) VALUES(?,?,?,?,?,?)',
      )
      .run(
        'browser-' + id,
        id,
        'pending',
        JSON.stringify(proposal),
        now,
        id === 'expired' ? '2000-01-01T00:00:00.000Z' : '2099-01-01T00:00:00.000Z',
      );
  }
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({ response: await route.fetch({ url: base + url.pathname + url.search }) });
  });
  await page.goto('./?view=connected');
  await page.getByLabel('Persoonlijke sessietoken', { exact: true }).fill('connected-reviewer');
  await page.getByRole('button', { name: 'Verbinden / vernieuwen', exact: true }).click();
  await page.getByRole('combobox', { name: 'Lokale aanvraag', exact: true }).selectOption(lead.id);
  const article = page.getByRole('heading', { name: 'reviewable.txt', exact: true }).locator('..');
  const review = article.getByRole('region', { name: 'Documentinhoud beoordelen' });
  await review.getByLabel('Waarde', { exact: true }).fill('DD-999');
  await review
    .getByRole('button', { name: 'Documentinhoud bevestigen · reviewer', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('niet bevestigd');
  await review.getByLabel('Waarde', { exact: true }).fill('DD-204');
  await review
    .getByLabel('Controleopmerking', { exact: true })
    .fill('Referentie letterlijk vergeleken met bron.');
  await review
    .getByRole('button', { name: 'Documentinhoud bevestigen · reviewer', exact: true })
    .click();
  await expect(article).toContainText('approved');
  await expect(
    article.getByRole('button', { name: 'Documentinhoud bevestigen · reviewer', exact: true }),
  ).toBeDisabled();
  const expired = page.getByRole('heading', { name: 'expired.txt', exact: true }).locator('..');
  await expect(expired).toContainText('expired');
  expect(store.get(lead.id).status).toBe(lead.status);
  await page.getByLabel('Persoonlijke sessietoken', { exact: true }).fill('invalid-session');
  await expect(page.getByRole('heading', { name: 'reviewable.txt', exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('region', { name: 'Resultaat en brongegevens', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Verbinden / vernieuwen', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('invalid-session');
});
