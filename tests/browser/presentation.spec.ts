import { test, expect } from '@playwright/test';

test('mobile dossier selection and new intake reveal and focus the selected details', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('./');
  const title = page.locator('#selected-case-title');
  await expect(title).not.toBeFocused();
  await expect(
    page.getByRole('heading', { name: 'Elke aanvraag, goed opgevolgd.' }),
  ).toBeInViewport();
  await page.getByRole('button', { name: /Bram Vermeer/ }).click();
  await expect(title).toHaveText('Schatting');
  await expect(title).toBeFocused();
  await expect(title).toBeInViewport();
  // Clicking the already selected row must also return the viewer to its details.
  await page.getByRole('button', { name: /Bram Vermeer/ }).click();
  await expect(title).toBeFocused();
  await expect(title).toBeInViewport();
  await page.getByRole('button', { name: '+ Nieuwe aanvraag', exact: true }).click();
  await page.getByRole('button', { name: 'Aanvraag verwerken', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(title).toContainText('Bezoek aan de Parkwoning');
  await expect(title).toBeFocused();
  await expect(title).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('desktop selection stays in the list and mobile evidence table is keyboard-scrollable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./');
  const row = page.getByRole('button', { name: /Bram Vermeer/ });
  await row.click();
  await expect(row).toBeFocused();
  await expect(page.getByRole('group', { name: 'Procesindicatoren', exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Filter aanvragen', exact: true })).toBeVisible();
  await expect(page.locator('.page-header')).toContainText('ontwikkeld met AI-assistentie');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('./?view=technical');
  const table = page.getByRole('region', { name: 'Bewijsvergelijking', exact: true });
  // Reach the scroll region using real Tab navigation, not programmatic focus.
  for (let i = 0; i < 35 && !(await table.evaluate((e) => e === document.activeElement)); i++)
    await page.keyboard.press('Tab');
  await expect(table).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => table.evaluate((e) => e.scrollLeft)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('small supporting text and keyboard focus retain sufficient contrast', async ({ page }) => {
  const contrast = async (selector: string, focus = false) =>
    page
      .locator(selector)
      .first()
      .evaluate((element, focus) => {
        const rgb = (color: string) =>
          color
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number);
        const luminance = (color: string) => {
          const c = rgb(color)
            .map((n) => n / 255)
            .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
          return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
        };
        let parent: Element | null = focus ? element.parentElement : element;
        while (parent && getComputedStyle(parent).backgroundColor === 'rgba(0, 0, 0, 0)')
          parent = parent.parentElement;
        const background = parent ? getComputedStyle(parent).backgroundColor : 'rgb(255, 255, 255)';
        const style = getComputedStyle(element);
        const a = luminance(focus ? style.outlineColor : style.color),
          b = luminance(background);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      }, focus);
  await page.goto('./');
  expect(await contrast('.row-meta time')).toBeGreaterThanOrEqual(4.5);
  await page.keyboard.press('Tab');
  await page.getByRole('button', { name: 'Rondleiding', exact: true }).focus();
  expect(await contrast('.header-actions button', true)).toBeGreaterThanOrEqual(3);
  await page.getByRole('button', { name: 'Proces & impact', exact: true }).click();
  expect(await contrast('.impact-result .fine')).toBeGreaterThanOrEqual(4.5);
});
