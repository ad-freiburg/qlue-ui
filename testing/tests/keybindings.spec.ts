import { test, expect } from '@playwright/test';

test('help keybinding', async ({ page }) => {
  await page.goto('./');
  await page.waitForLoadState('networkidle');
  await page.getByRole('textbox', { name: 'Editor content' }).press('?');
  await expect(page.locator('#helpModal')).toBeVisible({ visible: false });
});

