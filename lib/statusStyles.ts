import { ApplicationStatus } from './types';

/**
 * Carbon Tag solo trae esta paleta categórica (sin ámbar/naranja), así que
 * "Entrevista" se remapea a purple en vez del ámbar del diseño anterior.
 */
export type CarbonTagType = 'gray' | 'blue' | 'purple' | 'green' | 'red';

export const STATUS_TAG_TYPE: Record<ApplicationStatus, CarbonTagType> = {
  POR_APLICAR: 'gray',
  APLICADO: 'blue',
  ENTREVISTA: 'purple',
  OFERTA: 'green',
  RECHAZADO: 'red',
};

/**
 * Mismos valores que usa <Tag type="..."> de Carbon internamente (ver
 * .cds--tag--{color} en app/carbon.css) — para acentos fuera del propio Tag:
 * borde inferior de columna, zona de destino al arrastrar.
 */
export const STATUS_ACCENT_COLOR: Record<ApplicationStatus, string> = {
  POR_APLICAR: 'var(--cds-tag-color-gray, #161616)',
  APLICADO: 'var(--cds-tag-color-blue, #0043ce)',
  ENTREVISTA: 'var(--cds-tag-color-purple, #6929c4)',
  OFERTA: 'var(--cds-tag-color-green, #0e6027)',
  RECHAZADO: 'var(--cds-tag-color-red, #a2191f)',
};

export const STATUS_SOFT_BG: Record<ApplicationStatus, string> = {
  POR_APLICAR: 'var(--cds-tag-background-gray, #e0e0e0)',
  APLICADO: 'var(--cds-tag-background-blue, #d0e2ff)',
  ENTREVISTA: 'var(--cds-tag-background-purple, #e8daff)',
  OFERTA: 'var(--cds-tag-background-green, #a7f0ba)',
  RECHAZADO: 'var(--cds-tag-background-red, #ffd7d9)',
};
