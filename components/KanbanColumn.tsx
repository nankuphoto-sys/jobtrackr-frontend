'use client';

import { useDroppable } from '@dnd-kit/core';
import { ApplicationStatus, JobApplication, STATUS_LABELS } from '@/lib/types';
import { KanbanCard } from './KanbanCard';

const HEADER_STYLES: Record<ApplicationStatus, string> = {
  POR_APLICAR: 'bg-gray-100 text-gray-700',
  APLICADO: 'bg-blue-100 text-blue-700',
  ENTREVISTA: 'bg-amber-100 text-amber-700',
  OFERTA: 'bg-green-100 text-green-700',
  RECHAZADO: 'bg-red-100 text-red-700',
};

export function KanbanColumn({
  status,
  applications,
  onDelete,
}: {
  status: ApplicationStatus;
  applications: JobApplication[];
  onDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="w-72 flex-shrink-0 snap-start" data-testid={`column-${status}`}>
      <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg ${HEADER_STYLES[status]}`}>
        <h2 className="text-sm font-semibold">{STATUS_LABELS[status]}</h2>
        <span className="text-xs font-medium opacity-70">{applications.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className={`min-h-[160px] p-2 space-y-2 rounded-b-lg border border-t-0 border-gray-200 transition-colors ${
          isOver ? 'bg-blue-50' : 'bg-gray-50'
        }`}
      >
        {applications.map((app) => (
          <KanbanCard key={app.id} app={app} onDelete={onDelete} />
        ))}
        {applications.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-6">Sin postulaciones</p>
        )}
      </div>
    </div>
  );
}
