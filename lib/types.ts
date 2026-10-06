export type ApplicationStatus =
  | 'POR_APLICAR'
  | 'APLICADO'
  | 'ENTREVISTA'
  | 'OFERTA'
  | 'RECHAZADO';

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'POR_APLICAR',
  'APLICADO',
  'ENTREVISTA',
  'OFERTA',
  'RECHAZADO',
];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  POR_APLICAR: 'Por aplicar',
  APLICADO: 'Aplicado',
  ENTREVISTA: 'Entrevista',
  OFERTA: 'Oferta',
  RECHAZADO: 'Rechazado',
};

export type Modality = 'remote' | 'hybrid' | 'onsite';
export type Seniority = 'junior' | 'mid' | 'senior';
export type SalaryPeriod = 'month' | 'year' | 'hour';

export const MODALITY_LABELS: Record<Modality, string> = { remote: 'Remoto', hybrid: 'Híbrido', onsite: 'Presencial' };
export const SENIORITY_LABELS: Record<Seniority, string> = { junior: 'Junior', mid: 'Semi-senior', senior: 'Senior' };
export const SALARY_PERIOD_LABELS: Record<SalaryPeriod, string> = { month: 'al mes', year: 'al año', hour: 'por hora' };

/** Aviso de seguimiento. Las reglas viven en el backend, para que el tablero y la revisión con IA usen las mismas. */
export interface Recordatorio {
  tipo: 'cierre' | 'sin-respuesta' | 'sin-novedades';
  /** Para 'cierre': días que faltan (negativo si ya cerró). Para los demás: días transcurridos. */
  dias: number;
  /** Texto corto para la tarjeta. */
  texto: string;
}

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  link: string | null;
  notes: string | null;
  appliedAt: string | null;
  // Campos de la oferta (extractor de IA local o carga manual), todos opcionales.
  location: string | null;
  modality: Modality | null;
  seniority: Seniority | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: SalaryPeriod | null;
  stack: string[];
  deadline: string | null;
  summary: string | null;
  /** Desde cuándo está en su estado actual (lo calcula el backend del historial). */
  statusChangedAt: string;
  /** Último "Hice seguimiento"; reinicia el recordatorio sin cambiar el estado. */
  lastFollowUpAt: string | null;
  /** Recordatorio de hoy, calculado por el backend (src/lib/recordatorios.ts), o null. */
  aviso: Recordatorio | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

/** Lo que devuelve POST /ai/extract-job (el backend no guarda nada). */
export interface OfertaExtraida {
  company: string | null;
  role: string;
  location: string | null;
  modality: Modality | 'unknown';
  seniority: Seniority | 'unknown';
  salary: { min: number | null; max: number | null; currency: string | null; period: SalaryPeriod | null };
  stack: string[];
  requirements: string[];
  language: string | null;
  applyUrl: string | null;
  deadline: string | null;
  summary: string;
}

export interface RespuestaExtractor {
  oferta: OfertaExtraida;
  /** Campos que el modelo devolvió pero no aparecen en el texto (se dejaron vacíos). */
  descartados: string[];
  intentos: number;
  ms: number;
}

export interface EstadoExtractor {
  habilitado: boolean;
  disponible: boolean;
  modelo: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export interface StatusChange {
  id: string;
  applicationId: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  changedAt: string;
}
