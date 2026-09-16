import { APIRequestContext, Locator, Page } from '@playwright/test';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function uniqueEmail(prefix: string): string {
  return `${prefix}+${Date.now()}-${Math.random().toString(36).slice(2, 8)}@jobtrackr.dev`;
}

/** Registra un usuario directo contra el backend (sin pasar por la UI) para dejar los tests de UI enfocados en lo que prueban. */
export async function registerTestUser(
  request: APIRequestContext,
  prefix = 'e2e'
): Promise<{ email: string; token: string }> {
  const email = uniqueEmail(prefix);
  const res = await request.post(`${API_URL}/auth/register`, {
    data: { email, password: 'secret123' },
  });
  const { token } = await res.json();
  return { email, token };
}

/** Deja al usuario "logueado" seteando el token en localStorage, igual que hace la app tras un login real. */
export async function loginAs(page: Page, token: string) {
  await page.goto('/login');
  await page.evaluate((t) => localStorage.setItem('jobtrackr_token', t), token);
}

/**
 * Arrastra una tarjeta a otra columna con eventos de mouse crudos (dnd-kit usa
 * Pointer Events, no HTML5 drag-and-drop nativo, así que `locator.dragTo()` no
 * sirve). Requiere el segundo `mouse.move` + las pausas: dnd-kit recalcula qué
 * droppable está debajo en su propio frame (rAF), no de forma síncrona con el
 * evento — sin darle ese margen, el drop es intermitente bajo carga.
 */
export async function dragCardToColumn(page: Page, card: Locator, targetColumn: Locator) {
  const targetBox = await targetColumn.boundingBox();
  if (!targetBox) throw new Error('No se encontró la columna destino');
  const x = targetBox.x + targetBox.width / 2;
  const y = targetBox.y + 80;

  await card.hover();
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 15 });
  await page.waitForTimeout(150);
  await page.mouse.move(x, y, { steps: 5 });
  await page.waitForTimeout(150);
  await page.mouse.up();
}
