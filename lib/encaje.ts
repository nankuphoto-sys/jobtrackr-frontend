// Puntaje de encaje entre una oferta y el perfil del usuario (fase 2 del
// extractor). Se calcula en código, no con el modelo: es determinista, gratis
// y se puede explicar punto por punto. El perfil viene de GET /ai/perfil
// (profile.json en el backend; null en producción).
import { Modality, Seniority } from './types';

export interface Perfil {
  stack: string[];
  modality: Modality[];
  seniority: Seniority;
}

export interface Encaje {
  /** 0-100, sobre las partes que la oferta permite comparar. */
  score: number;
  /** Tecnologías de la oferta que están en el perfil (con el nombre de la oferta). */
  matched: string[];
  /** Tecnologías de la oferta que no están en el perfil. */
  missing: string[];
}

export const PESOS = { stack: 70, modality: 15, seniority: 15 } as const;

const NIVEL: Record<Seniority, number> = { junior: 0, mid: 1, senior: 2 };

// Distintas formas de escribir lo mismo. La clave ya está normalizada (sin
// mayúsculas, tildes ni signos).
const ALIAS: Record<string, string> = {
  js: 'javascript',
  ecmascript: 'javascript',
  ts: 'typescript',
  postgres: 'postgresql',
  psql: 'postgresql',
  tailwindcss: 'tailwind',
  golang: 'go',
  k8s: 'kubernetes',
  mongo: 'mongodb',
  reactnative: 'react native',
};

/** Para el color y el texto accesible: alto ≥ 70, medio ≥ 40, bajo < 40. */
export function nivelEncaje(score: number): 'alto' | 'medio' | 'bajo' {
  return score >= 70 ? 'alto' : score >= 40 ? 'medio' : 'bajo';
}

/** "Node.js", "nodejs" y "Node" → "node"; "Postgres" → "postgresql". */
export function normalizarTecnologia(t: string): string {
  let s = t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9#+]/g, '');
  if (ALIAS[s]) return ALIAS[s];
  // Sufijo "js" de frameworks (reactjs, nextjs, vuejs, expressjs).
  if (s.length > 4 && s.endsWith('js')) s = s.slice(0, -2);
  return ALIAS[s] ?? s;
}

/**
 * Stack: % de la oferta que el usuario ya maneja (70 pts).
 * Modalidad: 15 pts si la de la oferta está entre las que acepta.
 * Seniority: 15 pts si coincide, la mitad si está a un nivel de distancia.
 * Lo que la oferta no dice (stack vacío, modalidad o seniority sin dato) no
 * cuenta ni a favor ni en contra: el puntaje se calcula sobre lo demás.
 * Devuelve null si no hay nada que comparar.
 */
export function calcularEncaje(
  oferta: { stack: string[]; modality: Modality | null; seniority: Seniority | null },
  perfil: Perfil,
): Encaje | null {
  const propio = new Set(perfil.stack.map(normalizarTecnologia));
  const matched: string[] = [];
  const missing: string[] = [];
  const vistos = new Set<string>();
  for (const t of oferta.stack) {
    const n = normalizarTecnologia(t);
    if (!n || vistos.has(n)) continue;
    vistos.add(n);
    (propio.has(n) ? matched : missing).push(t.trim());
  }

  let ganado = 0;
  let posible = 0;
  if (vistos.size > 0) {
    posible += PESOS.stack;
    ganado += (PESOS.stack * matched.length) / vistos.size;
  }
  if (oferta.modality) {
    posible += PESOS.modality;
    if (perfil.modality.includes(oferta.modality)) ganado += PESOS.modality;
  }
  if (oferta.seniority) {
    posible += PESOS.seniority;
    const distancia = Math.abs(NIVEL[oferta.seniority] - NIVEL[perfil.seniority]);
    if (distancia === 0) ganado += PESOS.seniority;
    else if (distancia === 1) ganado += PESOS.seniority / 2;
  }
  if (posible === 0) return null;
  return { score: Math.round((100 * ganado) / posible), matched, missing };
}
