import { describe, it, expect } from 'vitest';
import { computeFunnel, computeAvgTimeInStatus } from './reports';
import { JobApplication, StatusChange } from './types';

function app(id: string, status: JobApplication['status']): JobApplication {
  return {
    id,
    company: 'X',
    role: 'Y',
    status,
    link: null,
    notes: null,
    appliedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    userId: 'u1',
  };
}

function change(applicationId: string, fromStatus: StatusChange['fromStatus'], toStatus: StatusChange['toStatus'], changedAt: string): StatusChange {
  return { id: `${applicationId}-${toStatus}`, applicationId, fromStatus, toStatus, changedAt };
}

describe('computeFunnel', () => {
  it('cuenta cuántas postulaciones llegaron a cada etapa, sin importar dónde están ahora', () => {
    const applications = [app('a', 'ENTREVISTA'), app('b', 'APLICADO'), app('c', 'POR_APLICAR')];
    const history: StatusChange[] = [
      change('a', null, 'POR_APLICAR', '2026-01-01'),
      change('a', 'POR_APLICAR', 'APLICADO', '2026-01-02'),
      change('a', 'APLICADO', 'ENTREVISTA', '2026-01-03'),
      change('b', null, 'APLICADO', '2026-01-01'), // creada directo en Aplicado, nunca pasó por Por aplicar
      change('c', null, 'POR_APLICAR', '2026-01-01'),
    ];

    const { stages, rejected } = computeFunnel(applications, history);

    expect(stages.map((s) => s.count)).toEqual([2, 2, 1, 0]); // POR_APLICAR, APLICADO, ENTREVISTA, OFERTA
    expect(rejected).toBe(0);
  });

  it('cuenta rechazadas aparte, no como una etapa del embudo', () => {
    const applications = [app('a', 'RECHAZADO')];
    const history: StatusChange[] = [
      change('a', null, 'POR_APLICAR', '2026-01-01'),
      change('a', 'POR_APLICAR', 'RECHAZADO', '2026-01-02'),
    ];

    const { stages, rejected } = computeFunnel(applications, history);

    expect(stages.map((s) => s.count)).toEqual([1, 0, 0, 0]);
    expect(rejected).toBe(1);
  });
});

describe('computeAvgTimeInStatus', () => {
  it('promedia los días entre que una postulación entra y sale de un estado', () => {
    const history: StatusChange[] = [
      change('a', null, 'POR_APLICAR', '2026-01-01T00:00:00.000Z'),
      change('a', 'POR_APLICAR', 'APLICADO', '2026-01-03T00:00:00.000Z'), // 2 días en POR_APLICAR
      change('b', null, 'POR_APLICAR', '2026-01-01T00:00:00.000Z'),
      change('b', 'POR_APLICAR', 'APLICADO', '2026-01-05T00:00:00.000Z'), // 4 días en POR_APLICAR
    ];

    const rows = computeAvgTimeInStatus(history);
    const porAplicar = rows.find((r) => r.status === 'POR_APLICAR');

    expect(porAplicar?.avgDays).toBe(3); // (2 + 4) / 2
    expect(porAplicar?.sampleSize).toBe(2);
  });

  it('devuelve null cuando ninguna postulación pasó por ese estado', () => {
    const rows = computeAvgTimeInStatus([]);
    expect(rows.every((r) => r.avgDays === null)).toBe(true);
  });
});
