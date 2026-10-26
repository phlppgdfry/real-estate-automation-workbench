import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const evidence = JSON.parse(readFileSync('public/dify/evidence.json', 'utf8'));
const assistantSummary = evidence.cases.find((x: { tool: string }) => x.tool === 'assist').result
  .proposal.summary;
test('three recorded real Dify runs render human-readable source evidence without calling a model', async ({
  page,
}) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Dify werkbank', exact: true }).click();
  let modelCalls = 0;
  await page.route('**/api/dify/**', (route) => {
    modelCalls++;
    return route.abort();
  });
  await page.getByRole('button', { name: 'Bekijk vastgelegde echte run' }).click();
  await expect(page.getByRole('heading', { name: 'Waardebepaling', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Dossierassistent', exact: true }).click();
  await page.getByRole('button', { name: 'Bekijk vastgelegde echte run' }).click();
  await expect(page.getByRole('heading', { name: assistantSummary, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Documentcontrole', exact: true }).click();
  await page.getByRole('button', { name: 'Bekijk vastgelegde echte run' }).click();
  await expect(page.getByRole('cell', { name: 'DD-204 Referentie: DD-204' })).toBeVisible();
  expect(modelCalls).toBe(0);
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  for (const image of await page
    .getByRole('region', { name: 'Dify werkbank' })
    .locator('img')
    .all()) {
    await expect(image).toHaveJSProperty('complete', true);
    await expect(image).not.toHaveJSProperty('naturalWidth', 0);
  }
});
test('local dossier selection uses reviewer session without persisting token and rejects PDF upload', async ({
  page,
}) => {
  await page.route('**/api/leads', (route) =>
    route.fulfill({ json: { leads: [{ id: 'local-case', status: 'manual' }] } }),
  );
  await page.route('**/api/dify/assist', async (route) => {
    expect(route.request().headers().authorization).toBe('Bearer test-session-token');
    expect(route.request().postDataJSON()).toEqual({
      leadId: 'local-case',
      question: 'Waarom is deze aanvraag geblokkeerd en wat is de veilige volgende stap?',
    });
    await route.fulfill({
      json: evidence.cases.find((x: { tool: string }) => x.tool === 'assist').result,
    });
  });
  await page.goto('./');
  await page.getByRole('button', { name: 'Dify werkbank', exact: true }).click();
  await page.getByRole('textbox', { name: 'Reviewer-token' }).fill('test-session-token');
  await page.getByRole('button', { name: 'Dossierassistent', exact: true }).click();
  await page.getByRole('button', { name: 'Lokale dossiers ophalen' }).click();
  await expect(page.getByRole('combobox', { name: 'Dossier', exact: true })).toHaveValue(
    'local-case',
  );
  await page.getByRole('button', { name: 'Echt uitvoeren via lokale API' }).click();
  await expect(page.getByRole('heading', { name: assistantSummary, exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    'test-session-token',
  );
  await page.getByRole('button', { name: 'Documentcontrole', exact: true }).click();
  await page
    .getByLabel('Tekstbestand toevoegen')
    .setInputFiles({ name: 'bad.pdf', mimeType: 'application/pdf', buffer: Buffer.from('demo') });
  await expect(page.getByRole('alert')).toContainText('TXT- of Markdown');
  await page.getByLabel('Tekstbestand toevoegen').setInputFiles({
    name: 'fiche.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('Referentie: DD-204\nGemeente: Oudenburg'),
  });
  await expect(page.getByRole('textbox', { name: 'Documenttekst' })).toHaveValue(
    'Referentie: DD-204\nGemeente: Oudenburg',
  );
  await page.reload();
  await page.getByRole('button', { name: 'Dify werkbank', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Reviewer-token' })).toHaveValue('');
});

test('flow guide explains ownership, resets steps per tool and loads a partial document example', async ({
  page,
}) => {
  await page.goto('./?view=dify');
  const guide = page.getByRole('region', { name: 'Uitleg van de Dify-flow' });
  await expect(guide.getByRole('heading', { name: 'Zo werkt aanvraaganalyse' })).toBeVisible();
  await guide.getByRole('button', { name: '3 · Bron en schema toetsen', exact: true }).click();
  await expect(
    guide.getByRole('heading', { name: '3 · Bron en schema toetsen', exact: true }),
  ).toBeVisible();
  await expect(guide).toContainText('De TypeScript-server valideert opnieuw');
  await page.getByRole('button', { name: 'Documentcontrole', exact: true }).click();
  await expect(
    guide.getByRole('button', { name: '1 · Documenttekst', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await guide.getByText('Testscenario’s & verwachte uitkomst', { exact: true }).click();
  await guide.getByRole('button', { name: 'Gebruik dit voorbeeld hierboven' }).click();
  await expect(page.getByRole('textbox', { name: 'Documenttekst' })).toHaveValue(
    'Referentie: DD-204\nGemeente: Oudenburg\nDeze fiche is fictief.',
  );
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('./?view=dify&evidence');
  await expect(page.getByRole('textbox', { name: 'Reviewer-token' })).toHaveCount(0);
  await page
    .getByRole('region', { name: 'Uitleg van de Dify-flow' })
    .getByText('Testscenario’s & verwachte uitkomst', { exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Gebruik dit voorbeeld hierboven' })).toHaveCount(
    0,
  );
});

test('browser validation works without eval under a restrictive script policy', async ({
  page,
}) => {
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: {
        ...response.headers(),
        'content-security-policy':
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws:; img-src 'self' data:",
      },
    });
  });
  await page.addInitScript(() => {
    (window as any).cspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      (window as any).cspViolations.push(event.blockedURI);
    });
  });
  await page.goto('./?view=dify');
  await page.getByRole('button', { name: 'Bekijk vastgelegde echte run' }).click();
  await expect(page.getByRole('heading', { name: 'Waardebepaling', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).cspViolations)).toEqual([]);
});
