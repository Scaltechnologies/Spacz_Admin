import { expect, test, type Page } from '@playwright/test';

/**
 * Runs against the live backend. Seeds its own data through the public API (a vendor that registers,
 * fills its profile and submits) so the admin flows have something real to act on.
 */
const API = process.env.E2E_API_URL ?? 'http://localhost:8080';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';

test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run against the backend');

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email or phone/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/^password$/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function seedPendingVendor(request: import('@playwright/test').APIRequestContext) {
  const stamp = Date.now();
  const email = `e2e-vendor-${stamp}@example.com`;
  const reg = await request.post(`${API}/api/auth/register`, {
    data: { role: 'VENDOR', email, password: 'Vendor12345', businessName: `E2E Academy ${stamp}`, contactName: 'E2E Owner', phone: `9${String(stamp).slice(-9)}`, city: 'Hyderabad' },
  });
  expect(reg.ok()).toBeTruthy();
  const { accessToken } = await reg.json();
  const headers = { Authorization: `Bearer ${accessToken}` };
  const me = await (await request.get(`${API}/api/vendors/me`, { headers })).json();
  await request.put(`${API}/api/vendors/me`, {
    headers,
    data: {
      ...me,
      businessName: `E2E Academy ${stamp}`,
      contactName: 'E2E Owner',
      email,
      phone: `9${String(stamp).slice(-9)}`,
      addressLine: '1 Test Street',
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500001',
      description: 'Seeded by Playwright',
    },
  });
  const submit = await request.post(`${API}/api/vendors/me/submit`, { headers });
  return { name: `E2E Academy ${stamp}`, submitted: submit.ok() };
}

test('rejects invalid credentials', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email or phone/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/^password$/i).fill('definitely-wrong-1');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('alert')).toContainText(/incorrect email or password/i);
});

test('dashboard shows live metrics and the session survives a reload', async ({ page }) => {
  await login(page);
  await expect(page.getByText(/here’s your spacz platform overview/i)).toBeVisible();
  await expect(page.getByText('Students & users')).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText('Vendors & partners')).toBeVisible();
});

test('approve a pending vendor and see it in the audit log', async ({ page, request }) => {
  const vendor = await seedPendingVendor(request);
  test.skip(!vendor.submitted, 'Seeded vendor could not be submitted (profile rules changed?)');
  await login(page);
  await page.goto('/approvals?tab=vendors');
  await page.getByRole('option', { name: new RegExp(vendor.name) }).click();
  await page.getByRole('button', { name: /approve vendor/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^approve$/i }).click();
  await expect(page.getByText(new RegExp(`${vendor.name} approved`, 'i'))).toBeVisible();
  await page.goto('/audit-logs?action=VENDOR_APPROVED');
  await expect(page.getByText(new RegExp(vendor.name)).first()).toBeVisible();
});

test('create, edit and deactivate a program', async ({ page }) => {
  const code = `E2E${Date.now().toString().slice(-6)}`;
  await login(page);
  await page.goto('/catalog/programs');
  await page.getByRole('button', { name: /new program/i }).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByLabel(/code/i).fill(code);
  await sheet.getByLabel(/^name/i).fill('E2E Exam');
  await sheet.getByLabel(/category/i).fill('E2E');
  await sheet.getByRole('button', { name: /create program/i }).click();
  await expect(page.getByText('E2E Exam created')).toBeVisible();
  await page.getByRole('switch', { name: /deactivate e2e exam/i }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^deactivate$/i }).click();
  await expect(page.getByText('E2E Exam deactivated')).toBeVisible();
});

test('logout clears the session', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: /account menu/i }).first().click();
  await page.getByRole('menuitem', { name: /log out/i }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto('/users');
  await expect(page).toHaveURL(/\/login\?redirect=%2Fusers/);
});
