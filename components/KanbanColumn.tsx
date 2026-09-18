'use client';

import { useDroppable } from '@dnd-kit/core';
import { ApplicationStatus, JobApplication, STATUS_LABELS } from '@/lib/types';
import { STATUS_ACCENT_COLOR, STATUS_SOFT_BG } from '@/lib/statusStyles';
import { KanbanCard } from './KanbanCard';

export function KanbanColumn({
  status,
  applications,
  onEdit,
  activeApp,
}: {
  status: ApplicationStatus;
  applications: JobApplication[];
  onEdit: (app: JobApplication) => void;
  /** La postulación que se está arrastrando ahora mismo (en cualquier columna), o null. */
  activeApp: JobApplication | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  const isValidDropTarget = Boolean(activeApp) && activeApp!.status !== status && isOver;
  const count = applications.length;
  const accent = STATUS_ACCENT_COLOR[status];

  return (
    <div className="flex min-w-0 flex-col gap-2.5" data-testid={`column-${status}`}>
      <div className="flex items-center gap-2 border-b-2 pb-2" style={{ borderColor: accent }}>
        <span
          className="flex-1 font-mono text-[11px] font-semibold uppercase tracking-[.08em]"
          style={{ color: isValidDropTarget ? accent : 'var(--cds-text-primary)' }}
        >
          {STATUS_LABELS[status]}
        </span>
        <span
          className="font-mono text-[11px] font-medium"
          style={{ color: isValidDropTarget ? accent : 'var(--cds-text-secondary)' }}
        >
          {isValidDropTarget
            ? `${String(count).padStart(2, '0')} → ${String(count + 1).padStart(2, '0')}`
            : String(count).padStart(2, '0')}
        </span>
      </div>

      <div ref={setNodeRef} className="flex flex-col gap-2">
        {applications.map((app) =>
          app.id === activeApp?.id ? (
            // Hueco de origen: mientras se arrastra, la tarjeta original deja este espacio reservado.
            <div
              key={app.id}
              className="h-[88px] border"
              style={{ borderStyle: 'dashed', borderColor: 'var(--cds-border-subtle-01)', background: 'var(--cds-background)' }}
            />
          ) : (
            <div key={app.id} className={isValidDropTarget ? 'opacity-50' : ''}>
              <KanbanCard app={app} onEdit={onEdit} />
            </div>
          )
        )}

        {isValidDropTarget && (
          <div
            className="flex h-[88px] items-center justify-center border-2"
            style={{ borderStyle: 'dashed', borderColor: accent, background: STATUS_SOFT_BG[status] }}
          >
            <span className="font-mono text-[10px] font-medium uppercase tracking-[.1em]" style={{ color: accent }}>
              Soltar aquí
            </span>
          </div>
        )}

        {count === 0 && !isValidDropTarget && (
          <p className="py-6 text-center text-xs text-[color:var(--cds-text-secondary)]">Sin postulaciones</p>
        )}
      </div>
    </div>
  );
}
