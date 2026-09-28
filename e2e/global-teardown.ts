import { existsSync, readFileSync, unlinkSync } from 'node:fs';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Borra los usuarios que crearon los tests (y en cascada sus postulaciones e
 * historial). Sin esto, cada corrida deja ~20 usuarios `@jobtrackr.dev` en la base.
 * No hace fallar la corrida: si un borrado falla, lo avisa por consola.
 */
export default async function globalTeardown() {
  const file = process.env.E2E_CLEANUP_FILE;
  if (!file || !existsSync(file)) return;

  // Por token, gana la última contraseña anotada (un test puede cambiarla).
  const users = new Map<string, string>();
  for (const line of readFileSync(file, 'utf8').split('\n').filter(Boolean)) {
    const { token, password } = JSON.parse(line) as { token: string; password: string };
    users.set(token, password);
  }

  const failures: string[] = [];
  for (const [token, password] of users) {
    const res = await fetch(`${API_URL}/auth/me`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ password }),
    }).catch(() => null);
    // 404: el propio test ya borró la cuenta (p. ej. "Eliminar mi cuenta").
    if (!res || (!res.ok && res.status !== 404)) failures.push(`HTTP ${res?.status ?? 'sin respuesta'}`);
  }

  unlinkSync(file);
  console.log(`[e2e] limpieza: ${users.size - failures.length}/${users.size} usuarios de test borrados`);
  if (failures.length) console.warn(`[e2e] no se pudieron borrar ${failures.length}: ${failures.join(', ')}`);
}
