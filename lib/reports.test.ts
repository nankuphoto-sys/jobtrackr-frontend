import { describe, it, expect } from 'vitest';
import { computeFunnel, computeAvgTimeInStatus, computeWeeklySummary } from './reports';
import { JobApplication, StatusChange } from './types';

function app(id: string, status: JobApplication['status'], extra: Partial<JobApplication> = {}): JobApplication {
  return {
    id,
    company: 'X',
    role: 'Y',
    status,
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
    statusChangedAt: '2026-01-01T00:00:00.000Z',
    lastFollowUpAt: null,
    aviso: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    userId: 'u1',
    ...extra,
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

describe('computeWeeklySummary', () => {
  // "Hoy": 5 de octubre de 2026, mediodía en horario local.
  const HOY = new Date(2026, 9, 5, 12, 0, 0);
  const haceDias = (n: number) => new Date(HOY.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
  const aviso = { tipo: 'sin-respuesta' as const, dias: 20, texto: 'Sin respuesta · 20 días' };

  it('cuenta nuevas y seguimientos solo de los últimos 7 días', () => {
    const applications = [
      app('a', 'APLICADO', { createdAt: haceDias(2), lastFollowUpAt: haceDias(1) }),
      app('b', 'APLICADO', { createdAt: haceDias(6), lastFollowUpAt: haceDias(8) }),
      app('c', 'APLICADO', { createdAt: haceDias(10) }),
    ];
    const r = computeWeeklySummary(applications, [], HOY);
    expect(r.nuevas).toBe(2);
    expect(r.conSeguimiento).toBe(1);
  });

  it('lista los cambios de estado de la semana, del más reciente al más viejo, sin contar la creación', () => {
    const applications = [app('a', 'ENTREVISTA', { company: 'Rappi' }), app('b', 'RECHAZADO', { company: 'Globant' })];
    const history = [
      change('a', null, 'APLICADO', haceDias(5)), // creación: no es un movimiento
      change('a', 'APLICADO', 'ENTREVISTA', haceDias(3)),
      change('b', 'APLICADO', 'RECHAZADO', haceDias(1)),
      change('b', 'POR_APLICAR', 'APLICADO', haceDias(9)), // fuera de la semana
    ];
    const r = computeWeeklySummary(applications, history, HOY);
    expect(r.movimientos.map((m) => `${m.company}:${m.fromStatus}->${m.toStatus}`)).toEqual([
      'Globant:APLICADO->RECHAZADO',
      'Rappi:APLICADO->ENTREVISTA',
    ]);
  });

  it('ignora movimientos de postulaciones que ya no existen', () => {
    const r = computeWeeklySummary([], [change('borrada', 'APLICADO', 'ENTREVISTA', haceDias(1))], HOY);
    expect(r.movimientos).toEqual([]);
  });

  it('toma los pendientes del aviso del backend (sin el campo, no es pendiente)', () => {
    const sinCampo = app('c', 'APLICADO');
    delete (sinCampo as Partial<JobApplication>).aviso;
    const applications = [app('a', 'APLICADO', { aviso }), app('b', 'APLICADO'), sinCampo];
    expect(computeWeeklySummary(applications, [], HOY).pendientes.map((a) => a.id)).toEqual(['a']);
  });

  it('lista las fechas límite de hoy a 7 días, solo en "Por aplicar", de la más cercana a la más lejana', () => {
    const applications = [
      app('lejos', 'POR_APLICAR', { company: 'Lejos', deadline: '2026-10-13T00:00:00.000Z' }), // 8 días
      app('siete', 'POR_APLICAR', { company: 'Siete', deadline: '2026-10-12T00:00:00.000Z' }),
      app('hoy', 'POR_APLICAR', { company: 'Hoy', deadline: '2026-10-05T00:00:00.000Z' }),
      app('paso', 'POR_APLICAR', { company: 'Pasó', deadline: '2026-10-04T00:00:00.000Z' }),
      app('aplicada', 'APLICADO', { company: 'Aplicada', deadline: '2026-10-06T00:00:00.000Z' }),
    ];
    const r = computeWeeklySummary(applications, [], HOY);
    expect(r.fechasLimite).toEqual([
      { applicationId: 'hoy', company: 'Hoy', dias: 0 },
      { applicationId: 'siete', company: 'Siete', dias: 7 },
    ]);
  });

  it('a las 11:30 p. m. la fecha límite de hoy sigue siendo hoy (no se corre por la zona horaria)', () => {
    const noche = new Date(2026, 9, 5, 23, 30, 0);
    const applications = [app('hoy', 'POR_APLICAR', { company: 'Hoy', deadline: '2026-10-05T00:00:00.000Z' })];
    expect(computeWeeklySummary(applications, [], noche).fechasLimite[0].dias).toBe(0);
  });
});
