import { test, expect } from '@playwright/test';
import { registerTestUser, loginAs } from './helpers';

test('crear y borrar una postulación', async ({ page, request }) => {
  const { token } = await registerTestUser(request, 'e2e-crud');
  await loginAs(page, token);

  await page.goto('/applications');
  await expect(page.getByText('Todavía no registraste ninguna postulación.')).toBeVisible();

  await page.getByRole('link', { name: '+ Nueva postulación' }).click();
  await page.fill('#company', 'Acme Corp');
  await page.fill('#role', 'Backend Developer');
  await page.selectOption('#status', 'APLICADO');
  await page.click('button[type=submit]');

  await expect(page).toHaveURL(/\/applications$/);
  await expect(page.getByText('Acme Corp')).toBeVisible();
  await expect(page.getByText('Backend Developer')).toBeVisible();

  page.on('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Borrar' }).click();
  await expect(page.getByText('Todavía no registraste ninguna postulación.')).toBeVisible();
});

test('editar una postulación existente actualiza sus campos', async ({ page, request }) => {
  const { token } = await registerTestUser(request, 'e2e-edit');
  await loginAs(page, token);

  await page.goto('/applications/new');
  await page.fill('#company', 'OldCo');
  await page.fill('#role', 'Old Role');
  await page.click('button[type=submit]');
  await expect(page).toHaveURL(/\/applications$/);

  await page.getByRole('link', { name: 'Editar' }).click();
  await expect(page.locator('#company')).toHaveValue('OldCo');

  await page.fill('#company', 'NewCo');
  await page.fill('#role', 'New Role');
  await page.click('button[type=submit]');

  await expect(page).toHaveURL(/\/applications$/);
  await expect(page.getByText('NewCo')).toBeVisible();
  await expect(page.getByText('New Role')).toBeVisible();
  await expect(page.getByText('OldCo')).not.toBeVisible();
});

test('editar un id inexistente muestra un mensaje claro en vez de un error crudo', async ({ page, request }) => {
  const { token } = await registerTestUser(request, 'e2e-notfound');
  await loginAs(page, token);

  await page.goto('/applications/no-existe-este-id/edit');
  await expect(page.getByText('Esta postulación no existe o no te pertenece.')).toBeVisible();
});
