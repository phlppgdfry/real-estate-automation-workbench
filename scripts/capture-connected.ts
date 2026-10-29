import { chromium } from '@playwright/test';
import { once } from 'node:events';
import { mkdirSync, renameSync } from 'node:fs';
import { makeServer } from '../server/app';
import { Store } from '../server/store';
import { catalog } from '../src/seed';
// Isolated, fictitious local API demonstration. No provider keys or Cloud runs.
const store = new Store();
const token = 'isolated-capture-credential';
const server = makeServer({
  store,
  listings: catalog(),
  credentials: [{ token, subject: 'portfolio-capture', roles: ['reviewer', 'operator'] }],
  webhookSecret: 'capture-only',
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const api = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
mkdirSync('public/dify/screenshots', { recursive: true });
mkdirSync('var/recordings', { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  recordVideo: { dir: 'var/recordings', size: { width: 1440, height: 1000 } },
});
const page = await context.newPage();
try {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: api + url.pathname + url.search });
    await route.fulfill({ response });
  });
  await page.goto(
    process.env.PREVIEW_URL ??
      'http://127.0.0.1:5194/real-estate-automation-workbench/?view=connected',
  );
  await page.getByRole('textbox', { name: 'Persoonlijke sessietoken', exact: true }).fill(token);
  await page.getByRole('button', { name: 'Verbinden / vernieuwen', exact: true }).click();
  await page.getByRole('button', { name: 'Duurzaam ontvangen', exact: true }).click();
  await page
    .getByRole('button', { name: 'Analysebatch uitvoeren · operator', exact: true })
    .click();
  await page.getByRole('combobox', { name: 'Lokale aanvraag', exact: true }).waitFor();
  await page.getByLabel('PDF, DOCX, EML, TXT of Markdown').setInputFiles({
    name: 'fictieve-pandfiche.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(
      'Referentie: DD-204\nGemeente: Oudenburg\nVraagprijs: 389000 EUR\nStatus: beschikbaar',
    ),
  });
  await page.getByRole('button', { name: 'Toevoegen aan dit dossier', exact: true }).click();
  await page.getByRole('heading', { name: 'fictieve-pandfiche.txt', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Zoek in actuele procedures', exact: true }).click();
  await page.getByText('Actuele procedures met bronnen opgehaald.', { exact: true }).waitFor();
  // Clear the session field before publishing captures, including this disposable token.
  await page.getByRole('textbox', { name: 'Persoonlijke sessietoken', exact: true }).fill('');
  await page.screenshot({
    path: 'public/dify/screenshots/connected-workspace.png',
    fullPage: true,
  });
  await page
    .getByRole('heading', { name: 'Interne procedures', exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'public/dify/screenshots/procedures.png' });
  await page.setViewportSize({ width: 375, height: 812 });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
    throw Error('MOBILE_OVERFLOW');
  await page.screenshot({ path: 'var/recordings/connected-mobile.png', fullPage: true });
  await context.close();
  const video = page.video();
  if (video) renameSync(await video.path(), 'public/dify/connected-local-demo.webm');
  console.log(
    'Captured real local API intake, analysis, file upload and procedure search. No live Dify model run claimed.',
  );
} finally {
  await browser.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  store.close();
}
