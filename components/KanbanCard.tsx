'use client';

import Link from 'next/link';
import { useDraggable } from '@dnd-kit/core';
import { JobApplication } from '@/lib/types';

/** Contenido visual puro de la tarjeta, sin hooks de drag — se reutiliza en el DragOverlay. */
export function CardContent({ app }: { app: JobApplication }) {
  return (
    <>
      <p className="font-semibold text-gray-900 text-sm">{app.company}</p>
      <p className="text-xs text-gray-600">{app.role}</p>
      {app.link && (
        <a
          href={app.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="mt-1 inline-block text-xs text-blue-600 hover:underline break-all"
        >
          {app.link}
        </a>
      )}
      {app.notes && <p className="mt-1 text-xs text-gray-500 line-clamp-2">{app.notes}</p>}
    </>
  );
}

export function KanbanCard({ app, onDelete }: { app: JobApplication; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: app.id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-gray-200 rounded-lg p-3 shadow-sm ${isDragging ? 'opacity-30' : ''}`}
    >
      {/* Solo esta zona es "agarrable": así los links/botones de abajo no compiten con el drag. */}
      <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing touch-none">
        <CardContent app={app} />
      </div>

      <div className="mt-2 pt-2 border-t border-gray-100 flex gap-3 text-xs">
        <Link href={`/applications/${app.id}/edit`} className="text-gray-500 hover:text-gray-700 hover:underline">
          Editar
        </Link>
        <button onClick={() => onDelete(app.id)} className="text-red-500 hover:text-red-700 hover:underline">
          Borrar
        </button>
      </div>
    </div>
  );
}
