import { ApplicationStatus, JobApplication, STATUS_LABELS, StatusChange } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export interface WeeklyCount {
  weekStart: Date;
  count: number;
}

/** Postulaciones creadas por semana, las últimas `weeks` semanas (incluye la actual). */
export function computeWeeklyCounts(applications: JobApplication[], weeks = 8): WeeklyCount[] {
  const now = new Date();
  const currentWeekStart = startOfWeek(now);

  const buckets: WeeklyCount[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    buckets.push({ weekStart: new Date(currentWeekStart.getTime() - i * WEEK_MS), count: 0 });
  }

  for (const app of applications) {
    const created = new Date(app.createdAt);
    const weekStart = startOfWeek(created);
    const bucket = buckets.find((b) => b.weekStart.getTime() === weekStart.getTime());
    if (bucket) bucket.count += 1;
  }

  return buckets;
}

function startOfWeek(date: Date): Date {
  const day = date.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - diffToMonday);
  return monday;
}

const FUNNEL_STAGES: ApplicationStatus[] = ['POR_APLICAR', 'APLICADO', 'ENTREVISTA', 'OFERTA'];

export interface FunnelStage {
  status: ApplicationStatus;
  label: string;
  count: number;
  /**
   * % respecto del total de postulaciones — no de la primera etapa: una
   * postulación puede crearse directo en un estado avanzado sin pasar por
   * "Por aplicar", así que una etapa posterior puede tener más casos que la
   * primera. Usar la primera etapa como base daría porcentajes de más de 100%.
   */
  pctOfTotal: number;
}

export interface FunnelResult {
  stages: FunnelStage[];
  rejected: number;
  rejectedPct: number;
}

/**
 * De todas las postulaciones, cuántas llegaron a cada etapa en algún momento
 * (no solo las que están ahí ahora). RECHAZADO no es una etapa de progreso —
 * se cuenta aparte porque puede pasar desde cualquier otra etapa.
 */
export function computeFunnel(applications: JobApplication[], history: StatusChange[]): FunnelResult {
  const reachedByApp = new Map<string, Set<ApplicationStatus>>();
  for (const change of history) {
    const set = reachedByApp.get(change.applicationId) ?? new Set<ApplicationStatus>();
    set.add(change.toStatus);
    reachedByApp.set(change.applicationId, set);
  }

  // Por si una postulación no tiene historial todavía (datos previos a esta función).
  for (const app of applications) {
    if (!reachedByApp.has(app.id)) {
      reachedByApp.set(app.id, new Set([app.status]));
    }
  }

  const counts = FUNNEL_STAGES.map(
    (status) => Array.from(reachedByApp.values()).filter((reached) => reached.has(status)).length
  );
  const total = applications.length || 1;

  const stages: FunnelStage[] = FUNNEL_STAGES.map((status, i) => ({
    status,
    label: STATUS_LABELS[status],
    count: counts[i],
    pctOfTotal: Math.round((counts[i] / total) * 100),
  }));

  const rejected = Array.from(reachedByApp.values()).filter((reached) => reached.has('RECHAZADO')).length;

  return { stages, rejected, rejectedPct: Math.round((rejected / (applications.length || 1)) * 100) };
}

export interface AvgTimeInStatus {
  status: ApplicationStatus;
  label: string;
  avgDays: number | null;
  sampleSize: number;
}

/**
 * Tiempo promedio (en días) que una postulación pasa en cada estado, contado
 * desde que entra hasta que sale (o hasta ahora, si sigue ahí).
 */
export function computeAvgTimeInStatus(history: StatusChange[]): AvgTimeInStatus[] {
  const byApp = new Map<string, StatusChange[]>();
  for (const change of history) {
    const list = byApp.get(change.applicationId) ?? [];
    list.push(change);
    byApp.set(change.applicationId, list);
  }

  const durationsByStatus = new Map<ApplicationStatus, number[]>();
  const now = Date.now();

  for (const changes of byApp.values()) {
    const sorted = [...changes].sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime());
    for (let i = 0; i < sorted.length; i++) {
      const enteredAt = new Date(sorted[i].changedAt).getTime();
      const leftAt = i + 1 < sorted.length ? new Date(sorted[i + 1].changedAt).getTime() : now;
      const days = (leftAt - enteredAt) / DAY_MS;
      const list = durationsByStatus.get(sorted[i].toStatus) ?? [];
      list.push(days);
      durationsByStatus.set(sorted[i].toStatus, list);
    }
  }

  return (['POR_APLICAR', 'APLICADO', 'ENTREVISTA', 'OFERTA', 'RECHAZADO'] as ApplicationStatus[]).map((status) => {
    const durations = durationsByStatus.get(status) ?? [];
    const avgDays = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
    return { status, label: STATUS_LABELS[status], avgDays, sampleSize: durations.length };
  });
}
