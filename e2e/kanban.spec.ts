import { test, expect, APIRequestContext } from '@playwright/test';
import { registerTestUser, loginAs, API_URL } from './helpers';

async function seedApplication(
  request: APIRequestContext,
  token: string,
  data: { company: string; role: string; status?: string }
) {
  await request.post(`${API_URL}/applications`, {
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
}

test('el tablero agrupa las postulaciones en la columna de su estado', async ({ page, request }) => {
  const { token } = await registerTestUser(request, 'e2e-kanban-columns');
  await seedApplication(request, token, { company: 'Acme', role: 'Backend Dev', status: 'POR_APLICAR' });
  await seedApplication(request, token, { company: 'Globex', role: 'Frontend Dev', status: 'ENTREVISTA' });

  await loginAs(page, token);
  await page.goto('/applications');

  await expect(page.locator('[data-testid="column-POR_APLICAR"]').getByText('Acme')).toBeVisible();
  await expect(page.locator('[data-testid="column-ENTREVISTA"]').getByText('Globex')).toBeVisible();
  await expect(page.locator('[data-testid="column-APLICADO"]').getByText('Sin postulaciones')).toBeVisible();
});

test('arrastrar una tarjeta a la columna vecina actualiza su estado', async ({ page, request }) => {
  const { token } = await registerTestUser(request, 'e2e-kanban-drag');
  await seedApplication(request, token, { company: 'Initech', role: 'QA Engineer', status: 'APLICADO' });

  await loginAs(page, token);
  await page.goto('/applications');

  const card = page.locator('[data-testid="column-APLICADO"] >> text=Initech');
  // Columna vecina (no la última): dnd-kit hace auto-scroll horizontal cuando el
  // cursor se acerca al borde de la fila, lo que desplaza las columnas y arruina
  // coordenadas calculadas de antemano para un target lejano. Con la columna de
  // al lado alcanza para probar el mecanismo sin pelear con el auto-scroll.
  const targetColumn = page.locator('[data-testid="column-ENTREVISTA"]');

  await card.hover();
  await page.mouse.down();
  const targetBox = await targetColumn.boundingBox();
  if (!targetBox) throw new Error('No se encontró la columna destino');
  const targetX = targetBox.x + targetBox.width / 2;
  const targetY = targetBox.y + 80;
  // dnd-kit necesita al menos dos eventos pointermove para recalcular qué
  // droppable está "debajo" antes del drop; un solo salto grande no alcanza.
  await page.mouse.move(targetX, targetY, { steps: 15 });
  await page.mouse.move(targetX, targetY, { steps: 5 });
  await page.mouse.up();

  await expect(page.locator('[data-testid="column-ENTREVISTA"]').getByText('Initech')).toBeVisible();

  const apps = await request
    .get(`${API_URL}/applications`, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => r.json());
  expect(apps.find((a: { company: string }) => a.company === 'Initech')?.status).toBe('ENTREVISTA');
});

test('las métricas de arriba reflejan los conteos y la tasa de respuesta', async ({ page, request }) => {
  const { token } = await registerTestUser(request, 'e2e-kanban-stats');
  await seedApplication(request, token, { company: 'A', role: 'X', status: 'POR_APLICAR' });
  await seedApplication(request, token, { company: 'B', role: 'X', status: 'APLICADO' });
  await seedApplication(request, token, { company: 'C', role: 'X', status: 'ENTREVISTA' });
  await seedApplication(request, token, { company: 'D', role: 'X', status: 'RECHAZADO' });

  await loginAs(page, token);
  await page.goto('/applications');

  // De 3 aplicadas (todo menos "Por aplicar"), 1 avanzó a Entrevista/Oferta -> 33%.
  await expect(page.getByText('33%')).toBeVisible();
  await expect(page.getByText('tasa de respuesta')).toBeVisible();
  await expect(page.getByText('4', { exact: true }).first()).toBeVisible();
});
