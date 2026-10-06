import { describe, it, expect } from 'vitest';
import { contarPendientes } from './stats';
import { JobApplication } from './types';

const aviso = { tipo: 'sin-respuesta' as const, dias: 20, texto: 'Sin respuesta · 20 días' };

describe('contarPendientes', () => {
  it('cuenta solo las postulaciones con aviso', () => {
    const apps = [{ aviso }, { aviso: null }, { aviso }] as JobApplication[];
    expect(contarPendientes(apps)).toBe(2);
  });

  it('no cuenta como pendiente una postulación sin el campo (backend anterior a los avisos)', () => {
    const apps = [{}, {}] as JobApplication[];
    expect(contarPendientes(apps)).toBe(0);
  });
});
