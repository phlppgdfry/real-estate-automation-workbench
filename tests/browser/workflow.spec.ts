import { test, expect } from '@playwright/test';
test('recruiter journey: inspect, approve, fail, retry, inspect exception, new lead, reset', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('./');
  await expect(page).toHaveTitle(/Duin & Dorp/);
  await expect(page.getByRole('heading', { name: 'Elke aanvraag, goed opgevolgd.' })).toBeVisible();
  await page.getByRole('button', { name: 'Goedkeuren & klaarzetten' }).click();
  await expect(page.getByRole('status')).toContainText('Goedgekeurd');
  await page.getByLabel('CRM-fout simuleren', { exact: true }).check();
  await page.getByRole('button', { name: 'CRM-wachtrij verwerken' }).click();
  await expect(page.getByRole('status')).toContainText('mislukt');
  await page.getByLabel('CRM-fout simuleren', { exact: true }).uncheck();
  await page.waitForTimeout(2100);
  await page.getByRole('button', { name: 'CRM-wachtrij verwerken' }).click();
  await expect(page.getByRole('status')).toContainText('bevestigd');
  await page.getByRole('button').filter({ hasText: 'Noor Peeters' }).click();
  await expect(
    page.getByText('Pand is verkocht; geen bezoek voorstellen.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Goedkeuren & klaarzetten' })).toBeDisabled();
  await page.getByRole('button', { name: '+ Nieuwe aanvraag', exact: true }).click();
  await page.getByLabel('Testscenario').selectOption('injection');
  await page.getByRole('button', { name: 'Aanvraag verwerken' }).click();
  await expect(
    page.getByText('Verdachte instructie in brontekst; menselijke beoordeling vereist.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button').filter({ hasText: 'Robin Demo' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  await expect(page.getByRole('button').filter({ hasText: 'Robin Demo' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Proces & impact', exact: true }).click();
  await page.getByLabel('Aanvragen per maand', { exact: true }).fill('0');
  await expect(page.getByText('geen positieve businesscase')).toBeVisible();
  await page.getByRole('button', { name: 'Technisch dossier', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Van demo naar controleerbare techniek.' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test('tour is keyboard accessible and completes seven steps', async ({ page }) => {
  await page.goto('./?tour');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 6; i++)
    await dialog.getByRole('button', { name: 'Volgende', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Rondleiding · stap 7 van 7' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Aan de slag' }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Rondleiding', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});
test('375px mobile has no horizontal overflow and primary actions work', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('./');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Goedkeuren & klaarzetten' }).click();
  await expect(page.getByRole('status')).toContainText('Goedgekeurd');
  await page.getByRole('button', { name: '+ Nieuwe aanvraag', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
