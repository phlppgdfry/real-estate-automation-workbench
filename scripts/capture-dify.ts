import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
const evidence = JSON.parse(readFileSync('public/dify/evidence.json', 'utf8'));
const summary = evidence.cases.find((x: { tool: string }) => x.tool === 'assist').result.proposal
  .summary;
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1536, height: 1050 },
    deviceScaleFactor: 1,
  });
  await page.goto(
    (process.env.PREVIEW_URL ?? 'http://127.0.0.1:4330/real-estate-automation-workbench/') +
      '?view=dify&evidence',
  );
  await page.getByRole('button', { name: 'Dossierassistent', exact: true }).click();
  await page.getByRole('button', { name: 'Bekijk vastgelegde echte run' }).click();
  await page.getByRole('heading', { name: summary, exact: true }).waitFor();
  await page.screenshot({ path: 'public/dify/screenshots/workbench.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: 'public/dify/screenshots/mobile.png', fullPage: true });
  console.log('Captured Dify workbench desktop and mobile. Recorded evidence, no credentials.');
} finally {
  await browser.close();
}
