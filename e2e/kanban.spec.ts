import { test, expect, APIRequestContext } from '@playwright/test';
import { registerTestUser, loginAs, dragCardToColumn, API_URL } from './helpers';

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

  await dragCardToColumn(page, card, targetColumn);

  await expect(page.locator('[data-testid="column-ENTREVISTA"]').getByText('Initech')).toBeVisible();

  // El PUT que persiste el cambio sigue en vuelo cuando la UI ya se actualizó
  // (optimista); poll en vez de asumir que ya terminó.
  await expect
    .poll(async () => {
      const apps = await request
        .get(`${API_URL}/applications`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json());
      return apps.find((a: { company: string }) => a.company === 'Initech')?.status;
    })
    .toBe('ENTREVISTA');
});

test('el drag por teclado mueve la tarjeta a la columna vecina con una sola flecha', async ({ page, request }) => {
  const { token } = await registerTestUser(request, 'e2e-kanban-keyboard');
  await seedApplication(request, token, { company: 'Initech', role: 'QA Engineer', status: 'APLICADO' });

  await loginAs(page, token);
  await page.goto('/applications');

  // Tab hasta enfocar la tarjeta (role="button" que provee useDraggable).
  const card = page.locator('[data-testid="column-APLICADO"] [role="button"]', { hasText: 'Initech' });
  await card.focus();
  await expect(card).toBeFocused();

  // dnd-kit recalcula colisiones en un frame aparte (igual que con el mouse,
  // donde hacían falta dos `mouse.move`); sin una pausa chica acá, el Space
  // final puede soltar antes de que el estado interno registre la columna
  // nueva.
  await page.keyboard.press('Space'); // levantar
  await page.waitForTimeout(150);
  await page.keyboard.press('ArrowRight'); // saltar a la columna vecina (Entrevista)
  await page.waitForTimeout(150);
  await page.keyboard.press('Space'); // soltar

  await expect(page.locator('[data-testid="column-ENTREVISTA"]').getByText('Initech')).toBeVisible();

  await expect
    .poll(async () => {
      const apps = await request
        .get(`${API_URL}/applications`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json());
      return apps.find((a: { company: string }) => a.company === 'Initech')?.status;
    })
    .toBe('ENTREVISTA');
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
  // Las métricas se renderizan dos veces (franja desktop + fila compacta mobile,
  // una de las dos oculta por CSS según el viewport) — se escopea a la desktop.
  const desktopStats = page.locator('[data-testid="stats-desktop"]');
  await expect(desktopStats.getByText('33%')).toBeVisible();
  await expect(desktopStats.getByText('Tasa de respuesta')).toBeVisible();
  await expect(desktopStats.getByText('4', { exact: true }).first()).toBeVisible();
});
