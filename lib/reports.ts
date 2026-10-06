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

export interface Movimiento {
  applicationId: string;
  company: string;
  fromStatus: ApplicationStatus;
  toStatus: ApplicationStatus;
  changedAt: string;
}

export interface FechaLimiteProxima {
  applicationId: string;
  company: string;
  /** Días de calendario que faltan (0 = hoy). */
  dias: number;
}

export interface WeeklySummary {
  /** Postulaciones creadas en los últimos 7 días. */
  nuevas: number;
  /** Cambios de estado de los últimos 7 días, del más reciente al más viejo (sin contar la creación). */
  movimientos: Movimiento[];
  /**
   * Postulaciones cuyo último seguimiento cae en los últimos 7 días. Solo se
   * guarda el último seguimiento de cada una, así que esto cuenta empresas
   * contactadas, no correos enviados.
   */
  conSeguimiento: number;
  /** Postulaciones con aviso hoy (calculado por el backend). */
  pendientes: JobApplication[];
  /** "Por aplicar" con fecha límite de hoy a 7 días, de la más cercana a la más lejana. */
  fechasLimite: FechaLimiteProxima[];
}

/**
 * Días de calendario desde hoy (horario local) hasta una fecha sin hora. El
 * deadline se guarda como medianoche UTC del día elegido: se compara por fecha,
 * no por instante, para que en UTC-5 no se corra un día.
 */
function diasHastaFecha(fecha: string, now: Date): number {
  const d = new Date(fecha);
  const limite = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const hoy = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((limite - hoy) / DAY_MS);
}

/**
 * Resumen de los últimos 7 días (no la semana de calendario: así el reporte
 * del lunes no sale casi vacío). Todo sale de datos que ya trae la API; no usa IA.
 */
export function computeWeeklySummary(
  applications: JobApplication[],
  history: StatusChange[],
  now: Date = new Date(),
): WeeklySummary {
  const desde = now.getTime() - WEEK_MS;
  const enLaSemana = (iso: string | null) => iso !== null && new Date(iso).getTime() >= desde;
  const porId = new Map(applications.map((a) => [a.id, a]));

  const movimientos: Movimiento[] = history
    .filter((c) => c.fromStatus !== null && enLaSemana(c.changedAt) && porId.has(c.applicationId))
    .map((c) => ({
      applicationId: c.applicationId,
      company: porId.get(c.applicationId)!.company,
      fromStatus: c.fromStatus as ApplicationStatus,
      toStatus: c.toStatus,
      changedAt: c.changedAt,
    }))
    .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());

  const fechasLimite: FechaLimiteProxima[] = applications
    .filter((a) => a.status === 'POR_APLICAR' && a.deadline !== null)
    .map((a) => ({ applicationId: a.id, company: a.company, dias: diasHastaFecha(a.deadline!, now) }))
    .filter((f) => f.dias >= 0 && f.dias <= 7)
    .sort((a, b) => a.dias - b.dias);

  return {
    nuevas: applications.filter((a) => enLaSemana(a.createdAt)).length,
    movimientos,
    conSeguimiento: applications.filter((a) => enLaSemana(a.lastFollowUpAt)).length,
    // Boolean() por la misma razón que contarPendientes: sin el campo, no es pendiente.
    pendientes: applications.filter((a) => Boolean(a.aviso)),
    fechasLimite,
  };
}
