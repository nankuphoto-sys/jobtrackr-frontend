import { describe, it, expect } from 'vitest';
import { calcularRecordatorio, contarPendientes } from './recordatorios';
import { JobApplication } from './types';

// "Hoy" fijo: mediodía del 5 de octubre de 2026 en horario local.
const HOY = new Date(2026, 9, 5, 12, 0, 0);

/** Un instante N días antes de HOY. */
function haceDias(n: number): string {
  return new Date(HOY.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
}

function app(overrides: Partial<JobApplication>): JobApplication {
  return {
    id: 'a1',
    company: 'Acme',
    role: 'Dev',
    status: 'APLICADO',
    link: null,
    notes: null,
    appliedAt: null,
    location: null,
    modality: null,
    seniority: null,
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: null,
    salaryPeriod: null,
    stack: [],
    deadline: null,
    summary: null,
    statusChangedAt: haceDias(0),
    lastFollowUpAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    userId: 'u1',
    ...overrides,
  };
}

describe('Aplicado', () => {
  it('no avisa el día 13 y avisa desde el día 14', () => {
    expect(calcularRecordatorio(app({ statusChangedAt: haceDias(13) }), HOY)).toBeNull();
    expect(calcularRecordatorio(app({ statusChangedAt: haceDias(14) }), HOY)).toEqual({
      tipo: 'sin-respuesta',
      dias: 14,
      texto: 'Sin respuesta · 14 días',
    });
  });

  it('un seguimiento reciente reinicia la cuenta', () => {
    const conSeguimiento = app({ statusChangedAt: haceDias(30), lastFollowUpAt: haceDias(2) });
    expect(calcularRecordatorio(conSeguimiento, HOY)).toBeNull();
  });

  it('un seguimiento viejo no tapa un cambio de estado más reciente', () => {
    // Seguimiento hace 40 días, pero pasó a Aplicado hace 15: cuentan los 15.
    const r = calcularRecordatorio(app({ statusChangedAt: haceDias(15), lastFollowUpAt: haceDias(40) }), HOY);
    expect(r?.dias).toBe(15);
  });
});

describe('Entrevista', () => {
  it('avisa desde el día 7 sin novedades', () => {
    expect(calcularRecordatorio(app({ status: 'ENTREVISTA', statusChangedAt: haceDias(6) }), HOY)).toBeNull();
    expect(calcularRecordatorio(app({ status: 'ENTREVISTA', statusChangedAt: haceDias(9) }), HOY)).toEqual({
      tipo: 'sin-novedades',
      dias: 9,
      texto: 'Sin novedades · 9 días',
    });
  });
});

describe('Por aplicar (fecha límite)', () => {
  const porAplicar = (deadline: string | null) => app({ status: 'POR_APLICAR', deadline, statusChangedAt: haceDias(60) });

  it('no avisa sin fecha límite, aunque lleve mucho tiempo', () => {
    expect(calcularRecordatorio(porAplicar(null), HOY)).toBeNull();
  });

  it('avisa desde 3 días antes, no 4', () => {
    expect(calcularRecordatorio(porAplicar('2026-10-09T00:00:00.000Z'), HOY)).toBeNull();
    expect(calcularRecordatorio(porAplicar('2026-10-08T00:00:00.000Z'), HOY)?.texto).toBe('Cierra en 3 días');
  });

  it('dice "hoy", "mañana" y "cerró" según el caso', () => {
    expect(calcularRecordatorio(porAplicar('2026-10-06T00:00:00.000Z'), HOY)?.texto).toBe('Cierra mañana');
    expect(calcularRecordatorio(porAplicar('2026-10-05T00:00:00.000Z'), HOY)?.texto).toBe('Cierra hoy');
    expect(calcularRecordatorio(porAplicar('2026-10-04T00:00:00.000Z'), HOY)?.texto).toBe('Cerró ayer');
    expect(calcularRecordatorio(porAplicar('2026-10-01T00:00:00.000Z'), HOY)).toMatchObject({ dias: -4, texto: 'Cerró hace 4 días' });
  });

  it('la fecha límite cuenta el día completo aunque sea de noche (no se adelanta por la zona horaria)', () => {
    const noche = new Date(2026, 9, 5, 23, 30, 0);
    expect(calcularRecordatorio(porAplicar('2026-10-05T00:00:00.000Z'), noche)?.texto).toBe('Cierra hoy');
  });
});

describe('Oferta y Rechazado', () => {
  it('nunca avisan, por viejas que sean', () => {
    expect(calcularRecordatorio(app({ status: 'OFERTA', statusChangedAt: haceDias(100) }), HOY)).toBeNull();
    expect(calcularRecordatorio(app({ status: 'RECHAZADO', statusChangedAt: haceDias(100) }), HOY)).toBeNull();
  });
});

describe('contarPendientes', () => {
  it('cuenta solo las que tienen aviso', () => {
    const apps = [
      app({ id: '1', statusChangedAt: haceDias(20) }),
      app({ id: '2', statusChangedAt: haceDias(1) }),
      app({ id: '3', status: 'ENTREVISTA', statusChangedAt: haceDias(8) }),
      app({ id: '4', status: 'RECHAZADO', statusChangedAt: haceDias(50) }),
    ];
    expect(contarPendientes(apps, HOY)).toBe(2);
  });
});
