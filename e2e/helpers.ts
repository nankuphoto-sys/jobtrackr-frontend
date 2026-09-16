import { APIRequestContext, Page } from '@playwright/test';

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
