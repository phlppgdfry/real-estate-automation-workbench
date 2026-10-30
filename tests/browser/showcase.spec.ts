import { test, expect } from '@playwright/test';
import { once } from 'node:events';
import { makeServer } from '../../server/app';
import { Store } from '../../server/store';
import { catalog } from '../../src/seed';
import { readFileSync } from 'node:fs';
const demo = JSON.parse(readFileSync('data/demo-video.json', 'utf8'));

let store: Store, server: ReturnType<typeof makeServer>, origin: string;
test.beforeAll(async () => {
  store = new Store();
  server = makeServer({
    store,
    listings: catalog(),
    staticRoot: 'dist',
    credentials: [{ token: 'public-media-fixture', subject: 'media-test', roles: ['reader'] }],
    webhookSecret: 'public-media-test',
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
test.afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  store.close();
});
test.beforeEach(async ({ page }) => {
  // Exercise the public hostname branch using the actual production build and media.
  await page.route('https://showcase.test/**', async (route) => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: origin + url.pathname + url.search });
    await route.fulfill({ response });
  });
});
const base = 'https://showcase.test/real-estate-automation-workbench/';
// Official Chrome includes H.264 on Linux too; WebM fallback is checked separately.
test.use({ channel: 'chrome' });

test('published video has readable duration, plays, seeks by chapter and reaches its end in MP4 and WebM', async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base + '?view=connected');
  const video = page.getByLabel('Duin & Dorp: van aanvraag naar bron', { exact: true });
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState))
    .toBeGreaterThanOrEqual(1);
  await page
    .locator('.video-heading')
    .evaluate((e) => scrollTo(0, e.getBoundingClientRect().top + scrollY - 24));
  await page.screenshot({ path: info.outputPath('video-player-desktop.png') });
  expect(await video.evaluate((v: HTMLVideoElement) => [v.videoWidth, v.videoHeight])).toEqual([
    demo.width,
    demo.height,
  ]);
  const duration = await video.evaluate((v: HTMLVideoElement) => v.duration);
  expect(duration).toBeGreaterThanOrEqual(65);
  expect(duration).toBeLessThanOrEqual(120);
  expect(Math.abs(duration - demo.duration)).toBeLessThan(0.1);
  expect(await video.evaluate((v: HTMLVideoElement) => v.currentSrc)).toContain('.mp4');
  await video.evaluate((v: HTMLVideoElement) => {
    v.muted = true;
    return v.play();
  });
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(0.2);
  const chapter = demo.chapters[3];
  await page.getByRole('button', { name: new RegExp(`Spring naar .*${chapter.title}`) }).click();
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThanOrEqual(chapter.start);
  await video.evaluate((v: HTMLVideoElement) => {
    v.currentTime = v.duration - 0.3;
  });
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.ended)).toBe(true);
  await video.evaluate((v: HTMLVideoElement) => {
    v.src = v.querySelectorAll('source')[1].src;
    v.load();
  });
  await expect
    .poll(() =>
      video.evaluate((v: HTMLVideoElement) => Number.isFinite(v.duration) && v.readyState >= 1),
    )
    .toBe(true);
  expect(await video.evaluate((v: HTMLVideoElement) => v.currentSrc)).toContain('.webm');
  expect(
    Math.abs((await video.evaluate((v: HTMLVideoElement) => v.duration)) - duration),
  ).toBeLessThan(0.2);
  await video.evaluate((v: HTMLVideoElement) => {
    v.currentTime = 35;
    return v.play();
  });
  await expect
    .poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(35.2);
  expect(await video.evaluate((v: HTMLVideoElement) => v.error)).toBeNull();
  await page.getByText('Lees de demonstratie stap voor stap', { exact: true }).click();
  await expect(page.locator('.video-transcript')).toContainText('Franse procedure');
  await page.setViewportSize({ width: 375, height: 812 });
  await page
    .locator('.video-heading')
    .evaluate((e) => scrollTo(0, e.getBoundingClientRect().top + scrollY - 24));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('video-player-mobile.png') });
  expect(errors).toEqual([]);
});

test('public production pages render on desktop and mobile without errors, missing assets or overflow', async ({
  page,
}, info) => {
  const errors: string[] = [];
  let apiCalls = 0;
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) apiCalls++;
  });
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base);
    await expect(page).toHaveTitle(/Duin & Dorp/);
    for (const name of [
      'Aanvragen',
      'Verbonden werkplek',
      'Dify werkbank',
      'Proces & impact',
      'Technisch dossier',
    ]) {
      await page
        .getByRole('navigation', { name: 'Werkplek' })
        .getByRole('button', { name, exact: true })
        .click();
      await expect(page.locator('main')).not.toBeEmpty();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: info.outputPath(`${width}-${name.replaceAll(' ', '-')}.png`) });
    }
  }
  expect(apiCalls).toBe(0);
  expect(errors).toEqual([]);
});
