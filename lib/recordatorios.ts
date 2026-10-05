import { JobApplication } from './types';

/** Días que se esperan antes de avisar. Ajustar acá cambia todo el tablero. */
export const UMBRALES = {
  /** "Por aplicar": avisar cuando falten estos días (o menos) para la fecha límite. */
  cierre: 3,
  /** "Aplicado": días sin respuesta ni seguimiento. */
  aplicado: 14,
  /** "Entrevista": días sin novedades después de la entrevista. */
  entrevista: 7,
} as const;

export type TipoRecordatorio = 'cierre' | 'sin-respuesta' | 'sin-novedades';

export interface Recordatorio {
  tipo: TipoRecordatorio;
  /** Para 'cierre': días que faltan (negativo si ya cerró). Para los demás: días transcurridos. */
  dias: number;
  /** Texto corto para la tarjeta. */
  texto: string;
}

const DIA_MS = 24 * 60 * 60 * 1000;

/** Días completos transcurridos entre dos instantes (16 días y 5 horas cuenta 16). */
function diasTranscurridos(desde: string, hoy: Date): number {
  return Math.floor((hoy.getTime() - new Date(desde).getTime()) / DIA_MS);
}

/**
 * Días de calendario que faltan para una fecha sin hora ("2026-10-08").
 * El deadline se compara en UTC (como en la tarjeta) contra el día de hoy en
 * horario local: si no, en Colombia (UTC-5) la fecha límite empezaría a contar
 * a las 7 p. m. del día anterior.
 */
function diasHasta(fecha: string, hoy: Date): number {
  const limite = new Date(fecha);
  const limiteDia = Date.UTC(limite.getUTCFullYear(), limite.getUTCMonth(), limite.getUTCDate());
  const hoyDia = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((limiteDia - hoyDia) / DIA_MS);
}

function textoCierre(dias: number): string {
  if (dias < 0) return dias === -1 ? 'Cerró ayer' : `Cerró hace ${-dias} días`;
  if (dias === 0) return 'Cierra hoy';
  if (dias === 1) return 'Cierra mañana';
  return `Cierra en ${dias} días`;
}

/** El último "movimiento" de la postulación: cambio de estado o seguimiento, el más reciente. */
function ultimoMovimiento(app: JobApplication): string {
  if (app.lastFollowUpAt && Date.parse(app.lastFollowUpAt) > Date.parse(app.statusChangedAt)) return app.lastFollowUpAt;
  return app.statusChangedAt;
}

/** El aviso que corresponde a una postulación hoy, o null si no hace falta ninguno. */
export function calcularRecordatorio(app: JobApplication, hoy: Date = new Date()): Recordatorio | null {
  switch (app.status) {
    case 'POR_APLICAR': {
      if (!app.deadline) return null;
      const dias = diasHasta(app.deadline, hoy);
      return dias <= UMBRALES.cierre ? { tipo: 'cierre', dias, texto: textoCierre(dias) } : null;
    }
    case 'APLICADO': {
      const dias = diasTranscurridos(ultimoMovimiento(app), hoy);
      return dias >= UMBRALES.aplicado ? { tipo: 'sin-respuesta', dias, texto: `Sin respuesta · ${dias} días` } : null;
    }
    case 'ENTREVISTA': {
      const dias = diasTranscurridos(ultimoMovimiento(app), hoy);
      return dias >= UMBRALES.entrevista ? { tipo: 'sin-novedades', dias, texto: `Sin novedades · ${dias} días` } : null;
    }
    // Oferta y Rechazado: la pelota ya no está en la cancha de nadie.
    default:
      return null;
  }
}

/** Cuántas postulaciones tienen un aviso hoy (para la barra de métricas). */
export function contarPendientes(applications: JobApplication[], hoy: Date = new Date()): number {
  return applications.filter((a) => calcularRecordatorio(a, hoy) !== null).length;
}
