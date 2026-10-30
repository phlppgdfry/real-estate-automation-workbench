import { chromium, expect, type Locator } from '@playwright/test';
import { once } from 'node:events';
import { mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { makeServer } from '../server/app';
import { Store } from '../server/store';
import { catalog } from '../src/seed';

// A paced recording of the real local API. No inherited provider keys or model calls.
// Requires npm run build, Playwright Chromium, ffmpeg and ffprobe.
const store = new Store();
const token = 'isolated-capture-credential';
const server = makeServer({
  store,
  listings: catalog(),
  staticRoot: 'dist',
  credentials: [{ token, subject: 'portfolio-capture', roles: ['reviewer', 'operator'] }],
  webhookSecret: 'capture-only',
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
mkdirSync('public/dify/screenshots', { recursive: true });
mkdirSync('var/recordings', { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  reducedMotion: 'reduce',
  recordVideo: { dir: 'var/recordings', size: { width: 1280, height: 900 } },
});
const page = await context.newPage();
const started = Date.now();
const chapters: { start: number; title: string; description: string }[] = [];
const errors: string[] = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('response', (response) => {
  if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
});
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function chapter(title: string, description: string) {
  chapters.push({ start: Math.round((Date.now() - started) / 1000), title, description });
  await page.evaluate(
    ({ title, description, index }) => {
      let band = document.getElementById('recording-caption');
      if (!band) {
        band = document.createElement('aside');
        band.id = 'recording-caption';
        band.style.cssText =
          'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#102d28;color:#fff;padding:16px 30px;border-top:3px solid #baebc8;box-shadow:0 -4px 24px #0002;font:18px/1.45 system-ui;pointer-events:none;min-height:86px;box-sizing:border-box';
        document.body.append(band);
        document.body.style.paddingBottom = '110px';
      }
      band.replaceChildren();
      const heading = document.createElement('strong');
      heading.style.cssText =
        'display:block;font-size:14px;letter-spacing:1px;text-transform:uppercase;color:#baebc8;margin-bottom:4px';
      heading.textContent = `Duin & Dorp · lokale demo · ${index}/7 · ${title}`;
      const text = document.createElement('span');
      text.textContent = description;
      band.append(heading, text);
    },
    { title, description, index: chapters.length },
  );
  console.log(`Recording ${chapters.length}/7: ${title}`);
}
async function frame(locator: Locator) {
  await locator.evaluate((element) => {
    const top = element.getBoundingClientRect().top + scrollY - 35;
    scrollTo({ top, behavior: 'instant' });
  });
  await pause(700);
}
async function click(name: string) {
  const button = page.getByRole('button', { name, exact: true });
  await button.hover();
  await pause(650);
  await button.click();
}
try {
  await page.goto(`${origin}/real-estate-automation-workbench/?view=connected`);
  await expect(
    page.getByRole('heading', { name: 'Eén dossier, één uitvoeringsgeschiedenis' }),
  ).toBeVisible();
  await chapter(
    'Van aanvraag naar bron',
    'Echte klikken en lokale API-verwerking met fictieve gegevens. Zonder betaalde modelcalls.',
  );
  await pause(6500);

  await chapter(
    'Verbinden',
    'Een persoonlijke sessie opent de lokale werkplek. De tijdelijke token blijft gemaskeerd.',
  );
  await frame(page.locator('.connection-bar'));
  await page.getByRole('textbox', { name: 'Persoonlijke sessietoken', exact: true }).fill(token);
  await pause(1500);
  await click('Verbinden / vernieuwen');
  await expect(page.getByRole('heading', { name: 'Fictieve aanvraag ontvangen' })).toBeVisible();
  await pause(5500);

  await chapter(
    'Duurzame intake',
    'De bezoekvraag wordt eerst opgeslagen. De ontvangstwachtrij staat klaar vóór de analyse.',
  );
  await frame(page.getByRole('heading', { name: 'Fictieve aanvraag ontvangen' }));
  await pause(1800);
  await click('Duurzaam ontvangen');
  await expect(page.getByText(/pending · 0 poging/)).toBeVisible();
  await pause(7000);

  await chapter(
    'Analyse en menselijke controle',
    'Lokale regels maken een dossier en conceptantwoord. Goedkeuring en overdracht blijven aparte acties.',
  );
  await click('Analysebatch uitvoeren · operator');
  await expect(page.getByRole('button', { name: 'Goedkeuren · reviewer' })).toBeEnabled();
  await frame(page.getByRole('heading', { name: 'Dossier', exact: true }));
  await pause(9500);

  await chapter(
    'Document toevoegen',
    'Een fictieve pandfiche wordt aan hetzelfde dossier gekoppeld. Geen bestand gaat naar Dify.',
  );
  await frame(page.getByRole('heading', { name: 'Documenteninbox' }));
  await page.getByLabel('PDF, DOCX, EML, TXT of Markdown').setInputFiles({
    name: 'fictieve-pandfiche.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(
      'Referentie: DD-204\nGemeente: Oudenburg\nVraagprijs: 389000 EUR\nStatus: beschikbaar',
    ),
  });
  await pause(2200);
  await click('Toevoegen aan dit dossier');
  await expect(
    page.getByRole('heading', { name: 'fictieve-pandfiche.txt', exact: true }),
  ).toBeVisible();
  await click('Bron bekijken');
  const result = page.getByRole('region', { name: 'Resultaat en brongegevens', exact: true });
  await expect(result).toContainText('Referentie: DD-204');
  await frame(result);
  await pause(7000);

  await chapter(
    'Actuele procedure · Nederlands',
    'De lokale zoekroute toont het antwoord met bron-ID en citaat. Verkochte panden worden uitgesloten.',
  );
  await frame(page.getByRole('heading', { name: 'Interne procedures' }));
  await pause(2500);
  await click('Zoek in actuele procedures');
  await expect(result).toContainText('SOP-VISIT-NL-2');
  await frame(result);
  await pause(8500);
  // Documentation captures do not include the editorial recording caption.
  await page
    .locator('#recording-caption')
    .evaluate((e) => ((e as HTMLElement).style.visibility = 'hidden'));
  await page.screenshot({
    path: 'public/dify/screenshots/connected-workspace.png',
    fullPage: true,
  });
  await page.screenshot({ path: 'public/dify/screenshots/procedures.png' });
  await page
    .locator('#recording-caption')
    .evaluate((e) => ((e as HTMLElement).style.visibility = 'visible'));

  await chapter(
    'Franse bron en controleerbaar resultaat',
    'Dezelfde vraag gebruikt nu uitsluitend de Franse procedure. Dit bewijst lokale werking, geen Dify Cloud-run.',
  );
  await frame(page.getByRole('heading', { name: 'Interne procedures' }));
  await page.getByRole('combobox', { name: 'Proceduretaal', exact: true }).selectOption('fr');
  await page
    .getByRole('textbox', { name: 'Vraag', exact: true })
    .fill('Pourquoi le bien vendu ne peut pas être visité ?');
  await pause(2200);
  await click('Zoek in actuele procedures');
  await expect(result).toContainText('SOP-VISIT-FR-1');
  await frame(result);
  await pause(10000);
  if (errors.length) throw Error(errors.join('\n'));
  const video = page.video();
  await context.close();
  if (!video) throw Error('RECORDING_MISSING');
  const raw = 'var/recordings/connected-paced.webm';
  await video.saveAs(raw);
  const base = 'public/dify/connected-local-demo';
  // Put the editorial caption above the UI, clear of native playback controls.
  const composition =
    '[0:v]split=2[ui][band];[ui]crop=1280:814:0:0,pad=1280:1000:0:110:color=0x102d28[canvas];[band]crop=1280:86:0:814[caption];[canvas][caption]overlay=0:12[video]';
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      raw,
      '-filter_complex',
      composition,
      '-map',
      '[video]',
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '22',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      `${base}.mp4`,
    ],
    { stdio: 'pipe' },
  );
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      raw,
      '-filter_complex',
      composition,
      '-map',
      '[video]',
      '-an',
      '-c:v',
      'libvpx-vp9',
      '-b:v',
      '0',
      '-crf',
      '34',
      '-row-mt',
      '1',
      `${base}.webm`,
    ],
    { stdio: 'pipe' },
  );
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-ss',
      String(chapters[3].start + 3),
      '-i',
      `${base}.mp4`,
      '-frames:v',
      '1',
      'public/dify/screenshots/connected-video-poster.png',
    ],
    { stdio: 'pipe' },
  );
  const probe = JSON.parse(
    execFileSync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration:stream=width,height',
        '-of',
        'json',
        `${base}.mp4`,
      ],
      { encoding: 'utf8' },
    ),
  );
  const duration = Number(probe.format.duration);
  if (duration < 65 || duration > 120) throw Error('UNEXPECTED_VIDEO_DURATION: ' + duration);
  const metadata = {
    title: 'Van aanvraag naar bron',
    duration,
    width: 1280,
    height: 1000,
    recordedAt: new Date().toISOString(),
    scope: 'Real local API, fictitious data, no provider credentials or Dify model requests.',
    chapters: chapters.map((c, i) => ({ ...c, start: i === 0 ? 0 : c.start })),
    files: ['mp4', 'webm'].map((format) => ({
      format,
      bytes: statSync(`${base}.${format}`).size,
      sha256: createHash('sha256')
        .update(readFileSync(`${base}.${format}`))
        .digest('hex'),
    })),
  };
  const json = JSON.stringify(metadata, null, 2) + '\n';
  writeFileSync('data/demo-video.json', json);
  writeFileSync('public/dify/demo-video.json', json);
  console.log(
    `PASS paced demo: ${duration.toFixed(2)}s; seven chapters; MP4 + WebM; real NL/FR source results.`,
  );
} finally {
  await browser.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  store.close();
}
