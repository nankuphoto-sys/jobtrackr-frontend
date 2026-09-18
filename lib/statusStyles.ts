import { ApplicationStatus } from './types';

/** Color de acento por estado: borde de 2px bajo la cabecera de columna, y borde/punto en otros usos. */
export const STATUS_BORDER_CLASS: Record<ApplicationStatus, string> = {
  POR_APLICAR: 'border-status-poraplicar',
  APLICADO: 'border-status-aplicado',
  ENTREVISTA: 'border-status-entrevista',
  OFERTA: 'border-status-oferta',
  RECHAZADO: 'border-status-rechazado',
};

/** Mismo color pero como fondo (puntos de la franja "Por estado" en el dashboard). */
export const STATUS_DOT_CLASS: Record<ApplicationStatus, string> = {
  POR_APLICAR: 'bg-status-poraplicar',
  APLICADO: 'bg-status-aplicado',
  ENTREVISTA: 'bg-status-entrevista',
  OFERTA: 'bg-status-oferta',
  RECHAZADO: 'bg-status-rechazado',
};

/**
 * Selector de estado del modal: fondo y borde del color pleno del estado, texto blanco.
 * (Distinto del chip "pastel" de la vista de lista por fecha, que este proyecto no implementa.)
 */
export const STATUS_CHIP_ACTIVE_CLASS: Record<ApplicationStatus, string> = {
  POR_APLICAR: 'bg-status-poraplicar border-status-poraplicar text-white',
  APLICADO: 'bg-status-aplicado border-status-aplicado text-white',
  ENTREVISTA: 'bg-status-entrevista border-status-entrevista text-white',
  OFERTA: 'bg-status-oferta border-status-oferta text-white',
  RECHAZADO: 'bg-status-rechazado border-status-rechazado text-white',
};

export const STATUS_CHIP_INACTIVE_CLASS = 'border-line text-muted';

/** Fondo pastel + texto de acento del estado — usado en la zona de destino al arrastrar. */
export const STATUS_SOFT_BG_CLASS: Record<ApplicationStatus, string> = {
  POR_APLICAR: 'bg-status-poraplicar-bg',
  APLICADO: 'bg-status-aplicado-bg',
  ENTREVISTA: 'bg-status-entrevista-bg',
  OFERTA: 'bg-status-oferta-bg',
  RECHAZADO: 'bg-status-rechazado-bg',
};

export const STATUS_ACCENT_TEXT_CLASS: Record<ApplicationStatus, string> = {
  POR_APLICAR: 'text-status-poraplicar-text',
  APLICADO: 'text-status-aplicado-text',
  ENTREVISTA: 'text-status-entrevista-text',
  OFERTA: 'text-status-oferta-text',
  RECHAZADO: 'text-status-rechazado-text',
};
