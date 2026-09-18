import { test, expect } from '@playwright/test';
import { registerTestUser, loginAs } from './helpers';

test('crear y borrar una postulación', async ({ page, request }) => {
  const { token } = await registerTestUser(request, 'e2e-crud');
  await loginAs(page, token);

  await page.goto('/applications');
  await expect(page.getByText('Tu tablero está vacío')).toBeVisible();

  await page.getByRole('button', { name: '+ Crear la primera' }).click();
  await page.getByLabel('Empresa *').fill('Acme Corp');
  await page.getByLabel('Cargo *').fill('Backend Developer');
  await page.getByRole('button', { name: 'Aplicado' }).click();
  await page.getByRole('button', { name: 'Guardar' }).click();
  await page.waitForSelector('h2:has-text("Nueva postulación")', { state: 'detached' });

  await expect(page.getByText('Acme Corp')).toBeVisible();
  await expect(page.getByText('Backend Developer')).toBeVisible();

  page.on('dialog', (d) => d.accept());
  await page.locator('[data-testid^="card-"]', { hasText: 'Acme Corp' }).click();
  await page.getByRole('button', { name: 'Eliminar' }).click();

  await expect(page.getByText('Tu tablero está vacío')).toBeVisible();
});

test('editar una postulación existente actualiza sus campos', async ({ page, request }) => {
  const { token } = await registerTestUser(request, 'e2e-edit');
  await loginAs(page, token);

  await page.goto('/applications');
  await page.getByRole('button', { name: '+ Crear la primera' }).click();
  await page.getByLabel('Empresa *').fill('OldCo');
  await page.getByLabel('Cargo *').fill('Old Role');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await page.waitForSelector('h2:has-text("Nueva postulación")', { state: 'detached' });

  await page.locator('[data-testid^="card-"]', { hasText: 'OldCo' }).click();
  await expect(page.getByLabel('Empresa *')).toHaveValue('OldCo');

  await page.getByLabel('Empresa *').fill('NewCo');
  await page.getByLabel('Cargo *').fill('New Role');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await page.waitForSelector('h2:has-text("Editar postulación")', { state: 'detached' });

  await expect(page.getByText('NewCo')).toBeVisible();
  await expect(page.getByText('New Role')).toBeVisible();
  await expect(page.getByText('OldCo')).not.toBeVisible();
});
