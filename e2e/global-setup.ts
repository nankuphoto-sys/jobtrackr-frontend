import { tmpdir } from 'node:os';
import { join } from 'node:path';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default async function globalSetup() {
  // Archivo donde los tests anotan los usuarios que crean (ver trackForCleanup);
  // global-teardown los borra al final. Playwright pasa este env a los workers.
  process.env.E2E_CLEANUP_FILE = join(tmpdir(), `jobtrackr-e2e-${Date.now()}.jsonl`);

  try {
    const res = await fetch(`${API_URL}/health`);
    if (!res.ok) throw new Error(`status ${res.status}`);
  } catch {
    throw new Error(
      `\n\nNo se pudo conectar con el backend en ${API_URL}/health.\n` +
        'Los tests e2e ejercitan el flujo real contra la API (registro, login, CRUD de postulaciones),\n' +
        'así que necesitan el backend de jobtrackr-backend corriendo (npm run dev) antes de lanzarlos.\n'
    );
  }
}
