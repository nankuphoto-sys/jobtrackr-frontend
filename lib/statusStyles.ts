import { ApplicationStatus } from './types';

export interface StatusPalette {
  /** Barra bajo la cabecera de columna / borde de 2px en el chip activo. */
  accent: string;
  /** Fondo del chip (activo en el modal, siempre en la tarjeta). */
  bg: string;
  /** Texto del chip — siempre oscuro, nunca blanco sobre el color pleno. */
  text: string;
}

/**
 * Rampa de temperatura fría → cálida, en el orden del proceso — no son 5
 * colores sueltos, el orden es parte del significado. Reemplaza la paleta
 * categórica fija de Carbon (<Tag type="..."> solo trae gray/blue/purple/
 * green/red, sin ámbar ni naranja): el estado se sigue mostrando con
 * componentes de Carbon alrededor, pero coloreado a mano con estos tokens.
 */
export const STATUS_PALETTE: Record<ApplicationStatus, StatusPalette> = {
  POR_APLICAR: { accent: '#94a3b8', bg: '#f1f5f9', text: '#475569' },
  APLICADO: { accent: '#0891b2', bg: '#ecfeff', text: '#155e75' },
  ENTREVISTA: { accent: '#ca8a04', bg: '#fefce8', text: '#854d0e' },
  OFERTA: { accent: '#ea580c', bg: '#fff7ed', text: '#9a3412' },
  RECHAZADO: { accent: '#9f1239', bg: '#fff1f2', text: '#881337' },
};

function pluck(key: keyof StatusPalette): Record<ApplicationStatus, string> {
  return Object.fromEntries(
    Object.entries(STATUS_PALETTE).map(([status, palette]) => [status, palette[key]])
  ) as Record<ApplicationStatus, string>;
}

export const STATUS_ACCENT_COLOR = pluck('accent');
export const STATUS_SOFT_BG = pluck('bg');
export const STATUS_CHIP_TEXT = pluck('text');
