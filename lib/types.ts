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

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  link: string | null;
  notes: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}
