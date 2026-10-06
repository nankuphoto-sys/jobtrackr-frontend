import { test, expect, APIRequestContext, Page } from '@playwright/test';
import { registerTestUser, loginAs, dragCardToColumn, API_URL } from './helpers';

const DIA_MS = 24 * 60 * 60 * 1000;

async function seedApplication(
  request: APIRequestContext,
  token: string,
  data: { company: string; role: string; status?: string; deadline?: string }
) {
  await request.post(`${API_URL}/applications`, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
}

type Aviso = { tipo: 'sin-respuesta' | 'sin-novedades'; dias: number; texto: string };

/**
 * Hace que ciertas postulaciones lleguen "viejas" (20 días quietas), reescribiendo
 * statusChangedAt y el `aviso` en la respuesta de GET /applications. La API no
 * deja crear postulaciones con fecha pasada, y el aviso lo calcula el backend:
 * las reglas en sí se prueban allá (src/lib/recordatorios.test.ts). Acá se
 * prueba que el tablero los muestre y que las acciones los quiten.
 */
async function envejecer(page: Page, avisos: Record<string, Aviso>) {
  await page.route(`${API_URL}/applications`, async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    const response = await route.fetch();
    const apps = (await response.json()) as { company: string; statusChangedAt: string; aviso: Aviso | null }[];
    for (const app of apps) {
      const aviso = avisos[app.company];
      if (!aviso) continue;
      app.statusChangedAt = new Date(Date.now() - aviso.dias * DIA_MS).toISOString();
      app.aviso = aviso;
    }
    await route.fulfill({ response, json: apps });
  });
}

const SIN_RESPUESTA: Aviso = { tipo: 'sin-respuesta', dias: 20, texto: 'Sin respuesta · 20 días' };
const SIN_NOVEDADES: Aviso = { tipo: 'sin-novedades', dias: 20, texto: 'Sin novedades · 20 días' };

function tarjeta(page: Page, empresa: string) {
  return page.locator('[data-testid^="card-"]', { hasText: empresa });
}

/** Fecha local de mañana como "YYYY-MM-DD" (el formato que guarda el deadline). */
function manana(): string {
  const d = new Date(Date.now() + DIA_MS);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

test('las postulaciones sin movimiento muestran su aviso y cuentan como pendientes', async ({ page, request }) => {
  const { token } = await registerTestUser(request, 'e2e-recordatorios');
  await seedApplication(request, token, { company: 'Rappi', role: 'Frontend Jr', status: 'APLICADO' });
  await seedApplication(request, token, { company: 'Globant', role: 'React Dev', status: 'ENTREVISTA' });
  await seedApplication(request, token, { company: 'Platzi', role: 'Fullstack Jr', status: 'POR_APLICAR', deadline: manana() });
  await seedApplication(request, token, { company: 'Nubank', role: 'Dev', status: 'OFERTA' });
  await seedApplication(request, token, { company: 'Reciente', role: 'Dev', status: 'APLICADO' });
  await envejecer(page, { Rappi: SIN_RESPUESTA, Globant: SIN_NOVEDADES });

  await loginAs(page, token);
  await page.goto('/applications');

  await expect(tarjeta(page, 'Rappi').getByTestId('recordatorio')).toHaveText('Sin respuesta · 20 días');
  await expect(tarjeta(page, 'Globant').getByTestId('recordatorio')).toHaveText('Sin novedades · 20 días');
  await expect(tarjeta(page, 'Platzi').getByTestId('recordatorio')).toHaveText('Cierra mañana');
  // Calculados de verdad por el backend: Oferta no avisa y una postulación reciente todavía no.
  await expect(tarjeta(page, 'Nubank').getByTestId('recordatorio')).toHaveCount(0);
  await expect(tarjeta(page, 'Reciente').getByTestId('recordatorio')).toHaveCount(0);

  const pendientes = page.getByTestId('stats-desktop').getByText('Pendientes').locator('..');
  await expect(pendientes).toContainText('3');
});

test('"Hice seguimiento" quita el aviso y queda guardado', async ({ page, request }) => {
  const { token } = await registerTestUser(request, 'e2e-recordatorios-seguimiento');
  await seedApplication(request, token, { company: 'Rappi', role: 'Frontend Jr', status: 'APLICADO' });
  await envejecer(page, { Rappi: SIN_RESPUESTA });

  await loginAs(page, token);
  await page.goto('/applications');
  await tarjeta(page, 'Rappi').click();

  await expect(page.getByTestId('recordatorio-modal')).toContainText('Sin respuesta · 20 días');
  await page.getByRole('button', { name: 'Hice seguimiento' }).click();

  await expect(page.getByTestId('recordatorio-modal')).toHaveCount(0);
  await expect(tarjeta(page, 'Rappi').getByTestId('recordatorio')).toHaveCount(0);
  // El estado no cambia; lo que se guarda es la fecha del seguimiento.
  await expect(page.locator('[data-testid="column-APLICADO"]').getByText('Rappi')).toBeVisible();
  const apps = await request
    .get(`${API_URL}/applications`, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => r.json());
  expect(apps[0]).toMatchObject({ status: 'APLICADO', lastFollowUpAt: expect.any(String) });
});

test('al arrastrar una tarjeta vieja a otra columna, el aviso no arrastra los días del estado anterior', async ({ page, request }) => {
  const { token } = await registerTestUser(request, 'e2e-recordatorios-drag');
  await seedApplication(request, token, { company: 'Initech', role: 'QA Engineer', status: 'APLICADO' });
  await envejecer(page, { Initech: SIN_RESPUESTA });

  await loginAs(page, token);
  await page.goto('/applications');
  await expect(tarjeta(page, 'Initech').getByTestId('recordatorio')).toHaveText('Sin respuesta · 20 días');

  await dragCardToColumn(page, tarjeta(page, 'Initech'), page.locator('[data-testid="column-ENTREVISTA"]'));

  await expect(page.locator('[data-testid="column-ENTREVISTA"]').getByText('Initech')).toBeVisible();
  // Recién movida a Entrevista: no puede decir "Sin novedades · 20 días".
  await expect(tarjeta(page, 'Initech').getByTestId('recordatorio')).toHaveCount(0);
});
