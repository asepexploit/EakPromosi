import { expect, test } from '@playwright/test';

/**
 * Smoke test: register fresh user → lands on dashboard → session persists on reload.
 * The dev stack seeds the Free plan so register-with-trial works out of the box.
 */
test('register → dashboard round-trip', async ({ page }) => {
  const stamp = Date.now();
  const email = `smoke-${stamp}@example.test`;
  const password = `smokepass-${stamp}`;

  await page.goto('/register');
  await page.getByLabel('Nama Tenant / Organisasi').fill(`Smoke ${stamp}`);
  await page.getByLabel('Nama Anda').fill('Smoke Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password (min 10 karakter)').fill(password);
  await page.getByRole('button', { name: 'Buat Akun' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});

test('invalid login shows error', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('nobody@example.test');
  await page.getByLabel('Password').fill('wrong-password-xx');
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page.getByText(/Email atau password salah/)).toBeVisible();
});
