import { test, expect } from '@playwright/test';
import { registerTestUser, loginAs, trackForCleanup, API_URL } from './helpers';

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
  trackForCleanup(token, 'nuevapass123');

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

test('el resumen "Esta semana" refleja movimientos, seguimientos, pendientes y fechas límite', async ({ page, request }) => {
  const { token } = await registerTestUser(request, 'e2e-account-semana');
  const headers = { Authorization: `Bearer ${token}` };

  // Rappi: pasa a Aplicado (un movimiento) y se le registra un seguimiento.
  const rappi = await request
    .post(`${API_URL}/applications`, { headers, data: { company: 'Rappi', role: 'Dev' } })
    .then((r) => r.json());
  await request.put(`${API_URL}/applications/${rappi.id}`, { headers, data: { status: 'APLICADO' } });
  await request.post(`${API_URL}/applications/${rappi.id}/follow-up`, { headers });

  // Platzi: por aplicar, cierra en 2 días (fecha local): fecha límite próxima y aviso pendiente.
  const d = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const deadline = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  await request.post(`${API_URL}/applications`, {
    headers: { ...headers, 'X-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone },
    data: { company: 'Platzi', role: 'Dev', deadline },
  });

  await loginAs(page, token);
  await page.goto('/account');
  await page.getByRole('tab', { name: 'Reportes' }).click();

  const resumen = page.getByTestId('resumen-semanal');
  await expect(resumen.getByText('Esta semana')).toBeVisible();
  await expect(resumen.getByText('Nuevas').locator('..')).toContainText('2');
  await expect(resumen.getByText('Cambios de estado').locator('..')).toContainText('1');
  await expect(resumen.getByText('Con seguimiento').locator('..')).toContainText('1');
  await expect(resumen.getByText('Pendientes hoy').locator('..')).toContainText('1');

  await expect(page.getByTestId('resumen-movimientos')).toContainText('Rappi');
  await expect(page.getByTestId('resumen-movimientos')).toContainText('Por aplicar →');
  await expect(page.getByTestId('resumen-pendientes')).toContainText('Platzi');
  await expect(page.getByTestId('resumen-pendientes')).toContainText('Cierra en 2 días');
  await expect(page.getByTestId('resumen-fechas')).toContainText('Cierra en 2 días');
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
