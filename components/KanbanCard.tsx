'use client';

import { useDraggable } from '@dnd-kit/core';
import { Tag, Tile } from '@carbon/react';
import { Link as LinkIcon, TextAlignLeft } from '@carbon/icons-react';
import { JobApplication } from '@/lib/types';
import { STATUS_LABELS } from '@/lib/types';
import { STATUS_TAG_TYPE } from '@/lib/statusStyles';

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
      <div className="flex items-center justify-between gap-2">
        <Tag type={STATUS_TAG_TYPE[app.status]} size="sm">
          {STATUS_LABELS[app.status]}
        </Tag>
        {hasIndicators && (
          <div className="flex items-center gap-2 text-[color:var(--cds-icon-secondary)]">
            {app.link && <LinkIcon size={16} />}
            {app.notes && <TextAlignLeft size={16} />}
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
