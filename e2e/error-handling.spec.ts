import { test, expect } from '@playwright/test';
import { registerTestUser, loginAs, dragCardToColumn, API_URL } from './helpers';

test('si la carga inicial falla, muestra el error con un botón de reintentar que funciona', async ({ page, request }) => {
  const { token } = await registerTestUser(request, 'e2e-load-error');
  await loginAs(page, token);

  let shouldFail = true;
  await page.route(`${API_URL}/applications`, (route) => {
    if (route.request().method() === 'GET' && shouldFail) {
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Error del servidor' }) });
    }
    return route.continue();
  });

  await page.goto('/applications');
  await expect(page.getByText('Error del servidor')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible();

  shouldFail = false;
  await page.getByRole('button', { name: 'Reintentar' }).click();

  await expect(page.getByText('Error del servidor')).not.toBeVisible();
  await expect(page.getByText('Todavía no registraste ninguna postulación.')).toBeVisible();
});

test('un error al cambiar de estado se muestra sin ocultar el tablero, y se puede cerrar', async ({ page, request }) => {
  const { token } = await registerTestUser(request, 'e2e-action-error');
  await request.post(`${API_URL}/applications`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { company: 'Acme', role: 'Dev', status: 'APLICADO' },
  });

  await loginAs(page, token);
  await page.goto('/applications');
  await expect(page.getByText('Acme')).toBeVisible();

  await page.route(`${API_URL}/applications/*`, (route) => {
    if (route.request().method() === 'PUT') {
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'No se pudo actualizar el estado' }) });
    }
    return route.continue();
  });

  const card = page.locator('[data-testid="column-APLICADO"] >> text=Acme');
  const targetColumn = page.locator('[data-testid="column-ENTREVISTA"]');
  await dragCardToColumn(page, card, targetColumn);

  // El banner de error aparece, pero la tarjeta y el tablero siguen visibles
  // (rollback al estado anterior) — antes este error tapaba todo el tablero.
  await expect(page.getByText('No se pudo actualizar el estado')).toBeVisible();
  await expect(page.locator('[data-testid="column-APLICADO"]').getByText('Acme')).toBeVisible();

  await page.getByRole('button', { name: 'Cerrar mensaje de error' }).click();
  await expect(page.getByText('No se pudo actualizar el estado')).not.toBeVisible();
});
