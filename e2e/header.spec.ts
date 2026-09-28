import { test, expect } from '@playwright/test';
import { registerTestUser, loginAs } from './helpers';

test('el avatar abre el panel de cuenta, Escape lo cierra y "Cerrar sesión" desloguea', async ({ page, request }) => {
  const { token } = await registerTestUser(request, 'e2e-header-panel');
  await loginAs(page, token);
  await page.goto('/applications');

  const avatar = page.getByRole('button', { name: 'Mi cuenta' });
  await avatar.click();
  await expect(avatar).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('link', { name: 'Mi cuenta' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(avatar).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toHaveCount(0);
  await expect(avatar).toBeFocused();

  await avatar.click();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('"Nueva postulación" desde /account vuelve al tablero con el modal abierto', async ({ page, request }) => {
  const { token } = await registerTestUser(request, 'e2e-header-create');
  await loginAs(page, token);
  await page.goto('/account');

  await page.getByRole('button', { name: 'Nueva postulación' }).click();
  await expect(page.getByRole('heading', { name: 'Nueva postulación' })).toBeVisible();
  await expect(page).toHaveURL(/\/applications$/);
});
