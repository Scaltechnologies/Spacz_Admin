import { expect, test } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';
test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run against the backend');

test('mobile navigation drawer reaches every section without horizontal scroll', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email or phone/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/^password$/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  for (const label of ['Users', 'Vendors & Partners', 'Study Halls', 'Bookings', 'Audit Logs']) {
    await page.getByRole('button', { name: /open navigation/i }).click();
    await page.getByRole('dialog').getByRole('link', { name: new RegExp(label) }).click();
    await expect(page.getByRole('heading', { level: 1, name: new RegExp(label.split(' ')[0]) })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }
});
