import { test, expect } from '@playwright/test';

test('clear cache button', async ({ page }) => {
  await page.goto('./wikidata');
  await page.waitForLoadState('networkidle');
  await page.click("#clearCacheButton");
  const request = await page.waitForResponse(
    req => {
      return req.request().method() === 'POST'
    });
  expect(request).toBeTruthy();
});


test('format button', async ({ page }) => {
  await page.goto('./wikidata');
  await page.waitForLoadState('networkidle');
  await page.getByRole('textbox', { name: 'Editor content' }).pressSequentially('SELECT   * \nWHERE { \n?s     ?p ?o}');
  await page.getByText('Format', { exact: true }).click();
  await expect(page.locator('.view-lines > div:nth-child(1)')).toContainText('SELECT * WHERE {');
  await expect(page.locator('.view-lines > div:nth-child(2)')).toContainText('?s ?p ?o');
  await expect(page.locator('.view-lines > div:nth-child(3)')).toContainText('}');
});
