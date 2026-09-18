import { test, expect } from '@playwright/test';
import { registerTestUser, loginAs, API_URL } from './helpers';

test('actualiza el nombre desde Perfil', async ({ page, request }) => {
  const { token } = await registerTestUser(request, 'e2e-account-profile');
  await loginAs(page, token);

  await page.goto('/account');
  await page.getByLabel('Nombre').fill('Ana Ramírez');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();

  await expect(page.getByText('Perfil actualizado')).toBeVisible();
  await expect(page.getByText('Ana Ramírez')).toBeVisible();
});

test('cambia la contraseña desde Configuración y permite loguear con la nueva', async ({ page, request }) => {
  const { token, email } = await registerTestUser(request, 'e2e-account-password');
  await loginAs(page, token);

  await page.goto('/account');
  await page.getByRole('tab', { name: 'Configuración' }).click();
  await page.getByLabel('Contraseña actual').fill('secret123');
  await page.getByLabel('Contraseña nueva', { exact: true }).fill('nuevapass123');
  await page.getByLabel('Confirmar contraseña nueva').fill('nuevapass123');
  await page.getByRole('button', { name: 'Cambiar contraseña' }).click();

  await expect(page.getByText('Contraseña actualizada')).toBeVisible();

  const loginRes = await request.post(`${API_URL}/auth/login`, { data: { email, password: 'nuevapass123' } });
  expect(loginRes.status()).toBe(200);
});

test('el embudo de Reportes refleja el historial real de estados', async ({ page, request }) => {
  const { token } = await registerTestUser(request, 'e2e-account-reports');
  const headers = { Authorization: `Bearer ${token}` };

  const created = await request
    .post(`${API_URL}/applications`, { headers, data: { company: 'Rappi', role: 'Dev' } })
    .then((r) => r.json());
  await request.put(`${API_URL}/applications/${created.id}`, { headers, data: { status: 'APLICADO' } });

  await loginAs(page, token);
  await page.goto('/account');
  await page.getByRole('tab', { name: 'Reportes' }).click();

  await expect(page.getByText('Embudo de conversión')).toBeVisible();
  await expect(page.getByText('1 · 100%').first()).toBeVisible();
});

test('elimina la cuenta y ya no se puede loguear con las credenciales viejas', async ({ page, request }) => {
  const { token, email } = await registerTestUser(request, 'e2e-account-delete');
  await loginAs(page, token);

  page.on('dialog', (d) => d.accept());
  await page.goto('/account');
  await page.getByRole('tab', { name: 'Configuración' }).click();
  await page.getByLabel('Confirma tu contraseña').fill('secret123');
  await page.getByRole('button', { name: 'Eliminar mi cuenta' }).click();

  await page.waitForURL('**/');

  const loginRes = await request.post(`${API_URL}/auth/login`, { data: { email, password: 'secret123' } });
  expect(loginRes.status()).toBe(401);
});
