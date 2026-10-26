import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
const evidence = JSON.parse(readFileSync('public/dify/evidence.json', 'utf8'));
const summary = evidence.cases.find((x: { tool: string }) => x.tool === 'assist').result.proposal
  .summary;
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1536, height: 1050 },
    deviceScaleFactor: 1,
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(
    (process.env.PREVIEW_URL ?? 'http://127.0.0.1:4330/real-estate-automation-workbench/') +
      '?view=dify&evidence',
  );
  await page.getByRole('button', { name: 'Dossierassistent', exact: true }).click();
  await page.getByRole('button', { name: 'Bekijk vastgelegde echte run' }).click();
  await page.getByRole('heading', { name: summary, exact: true }).waitFor();
  await page.screenshot({ path: 'public/dify/screenshots/workbench.png', fullPage: true });
  await page
    .getByRole('region', { name: 'Uitleg van de Dify-flow' })
    .getByText('Testscenario’s & verwachte uitkomst', { exact: true })
    .click();
  await page
    .getByRole('region', { name: 'Uitleg van de Dify-flow' })
    .screenshot({ path: 'public/dify/screenshots/guide.png' });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: 'public/dify/screenshots/mobile.png', fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  const images = await page
    .locator('.dify-gallery img')
    .evaluateAll((images) =>
      images.every(
        (image) =>
          (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0,
      ),
    );
  writeFileSync(
    '/private/tmp/dify-ui-qa.json',
    JSON.stringify(
      {
        url: page.url(),
        title: await page.title(),
        errors,
        overflow,
        images,
        desktop: [1536, 1050],
        mobile: [375, 812],
      },
      null,
      2,
    ),
  );
  if (errors.length || overflow || !images) throw new Error('UI_QA_FAILED');
  console.log('Captured Dify workbench desktop and mobile. Recorded evidence, no credentials.');
} finally {
  await browser.close();
}
