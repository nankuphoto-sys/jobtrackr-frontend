'use client';

import { useDraggable } from '@dnd-kit/core';
import { JobApplication } from '@/lib/types';
import { STATUS_BORDER_CLASS } from '@/lib/statusStyles';

const MONTHS_ES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

// UTC, no local time: appliedAt es una fecha sin hora ("2026-03-11"), y leerla en
// horario local podría restarle un día en zonas UTC-N (Colombia incluida).
function formatCardDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${day} ${MONTHS_ES[d.getUTCMonth()]}`;
}

function LinkIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2.2}>
      <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2.2}>
      <path d="M4 5h16M4 11h16M4 17h9" />
    </svg>
  );
}

/** Contenido visual puro de la tarjeta, sin hooks de drag — se reutiliza en el DragOverlay. */
export function CardContent({ app }: { app: JobApplication }) {
  const hasIndicators = Boolean(app.link || app.notes);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-[14px] leading-[1.25] text-ink">{app.company}</span>
        <span className="shrink-0 whitespace-nowrap font-mono text-[10px] font-medium leading-[1.4] text-muted">
          {formatCardDate(app.appliedAt ?? app.createdAt)}
        </span>
      </div>
      <span className="text-[13px] leading-[1.35] text-ink-3">{app.role}</span>
      {hasIndicators && (
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <div className="flex gap-[5px]">
            {app.link && (
              <span className="grid h-[18px] w-[18px] place-items-center border border-line">
                <LinkIcon />
              </span>
            )}
            {app.notes && (
              <span className="grid h-[18px] w-[18px] place-items-center border border-line">
                <NotesIcon />
              </span>
            )}
          </div>
          <span className="hidden font-mono text-[10px] font-medium uppercase tracking-[.08em] text-muted max-sm:inline">
            Mover →
          </span>
        </div>
      )}
    </div>
  );
}

export function KanbanCard({
  app,
  onEdit,
}: {
  app: JobApplication;
  onEdit: (app: JobApplication) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: app.id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const isOferta = app.status === 'OFERTA';
  const isRechazado = app.status === 'RECHAZADO';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onEdit(app)}
      data-testid={`card-${app.id}`}
      className={[
        'cursor-grab touch-none border border-line bg-surface p-3 outline-none transition-colors active:cursor-grabbing hover:border-line-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2',
        isOferta ? `border-l-[3px] ${STATUS_BORDER_CLASS.OFERTA}` : '',
        isRechazado ? 'opacity-[.72] hover:opacity-100' : '',
        isDragging ? 'opacity-30' : '',
      ].join(' ')}
    >
      <CardContent app={app} />
    </div>
  );
}
