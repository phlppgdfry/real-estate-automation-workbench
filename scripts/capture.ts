import { chromium } from '@playwright/test';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1536, height: 1024 },
    deviceScaleFactor: 1,
  });
  await page.goto('http://127.0.0.1:5187/real-estate-automation-workbench/');
  await page.getByRole('heading', { name: 'Elke aanvraag, goed opgevolgd.' }).waitFor();
  await page.screenshot({ path: 'public/preview.png', fullPage: false });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: '/private/tmp/estate-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: '/private/tmp/estate-laptop.png', fullPage: false });
  console.log(
    'Screenshots: public/preview.png, /private/tmp/estate-mobile.png, /private/tmp/estate-laptop.png',
  );
} finally {
  await browser.close();
}
