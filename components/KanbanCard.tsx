'use client';

import { useDraggable } from '@dnd-kit/core';
import { Tile } from '@carbon/react';
import { Link as LinkIcon, TextAlignLeft, Time } from '@carbon/icons-react';
import { JobApplication, Recordatorio } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/types';
import { STATUS_SOFT_BG, STATUS_CHIP_TEXT } from '@/lib/statusStyles';
import { calcularEncaje, nivelEncaje } from '@/lib/encaje';
import { usePerfilDelTablero } from '@/lib/usePerfil';

/**
 * Fondo del aviso. Texto siempre en --cds-text-primary: el amarillo de Carbon
 * como color de texto no pasa contraste AA sobre fondo claro. Rojo solo cuando
 * la fecha límite es hoy o ya pasó.
 */
export function fondoRecordatorio(r: Recordatorio): string {
  return r.tipo === 'cierre' && r.dias <= 0
    ? 'var(--cds-notification-background-error)'
    : 'var(--cds-notification-background-warning)';
}

/** "Sin respuesta · 16 días" — solo si la postulación necesita atención hoy. */
function RecordatorioBadge({ app }: { app: JobApplication }) {
  const r = app.aviso;
  if (!r) return null;
  return (
    <span
      className="inline-flex items-center gap-1 self-start px-1.5 py-0.5 text-[11px] font-medium leading-[1.4] text-[color:var(--cds-text-primary)]"
      style={{ background: fondoRecordatorio(r) }}
      data-testid="recordatorio"
    >
      <Time size={12} aria-hidden />
      {r.texto}
    </span>
  );
}

// Tokens de Carbon para que el color siga el tema claro/oscuro.
const COLOR_ENCAJE = {
  alto: 'var(--cds-support-success)',
  medio: 'var(--cds-support-warning)',
  bajo: 'var(--cds-text-secondary)',
} as const;

/** "Encaje 72" — solo si hay perfil (profile.json local) y la tarjeta tiene datos para comparar. */
function EncajeBadge({ app }: { app: JobApplication }) {
  const perfil = usePerfilDelTablero();
  const encaje = perfil ? calcularEncaje(app, perfil) : null;
  if (!encaje) return null;
  const nivel = nivelEncaje(encaje.score);
  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-[11px] text-[color:var(--cds-text-secondary)]"
      title={`Encaje ${nivel} con tu perfil: ${encaje.matched.length} de ${encaje.matched.length + encaje.missing.length} tecnologías`}
      data-testid="encaje-badge"
    >
      <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: COLOR_ENCAJE[nivel] }} />
      Encaje {encaje.score}
    </span>
  );
}

const MONTHS_ES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

// UTC, no local time: appliedAt es una fecha sin hora ("2026-03-11"), y leerla en
// horario local podría restarle un día en zonas UTC-N (Colombia incluida).
function formatCardDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${day} ${MONTHS_ES[d.getUTCMonth()]}`;
}

/** Contenido visual puro de la tarjeta, sin hooks de drag — se reutiliza en el DragOverlay. */
export function CardContent({ app }: { app: JobApplication }) {
  const hasIndicators = Boolean(app.link || app.notes);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[15px] font-semibold leading-[1.25] text-[color:var(--cds-text-primary)]">
          {app.company}
        </span>
        <span className="shrink-0 whitespace-nowrap font-mono text-[11px] text-[color:var(--cds-text-secondary)]">
          {formatCardDate(app.appliedAt ?? app.createdAt)}
        </span>
      </div>
      <span className="text-[13px] leading-[1.35] text-[color:var(--cds-text-secondary)]">{app.role}</span>
      <RecordatorioBadge app={app} />
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold leading-[1.4]"
            style={{ background: STATUS_SOFT_BG[app.status], color: STATUS_CHIP_TEXT[app.status] }}
          >
            {STATUS_LABELS[app.status]}
          </span>
          <EncajeBadge app={app} />
        </div>
        {hasIndicators && (
          <div className="flex items-center gap-2 text-[color:var(--cds-icon-secondary)]">
            {app.link && <LinkIcon size={16} className="jt-icon jt-icon-link" />}
            {app.notes && <TextAlignLeft size={16} className="jt-icon jt-icon-notes" />}
          </div>
        )}
      </div>
    </div>
  );
}

export function KanbanCard({
  app,
  onEdit,
  compact = false,
}: {
  app: JobApplication;
  onEdit: (app: JobApplication) => void;
  compact?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: app.id });

  const style = {
    ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {}),
    ...(compact ? { padding: '0.5rem' } : {}),
  };

  return (
    <Tile
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onEdit(app)}
      data-testid={`card-${app.id}`}
      className={`cursor-grab touch-none outline-none transition-opacity active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--cds-focus)] ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      <CardContent app={app} />
    </Tile>
  );
}
