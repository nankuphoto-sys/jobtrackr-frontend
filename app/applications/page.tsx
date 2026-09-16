'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardCode,
  KeyboardCoordinateGetter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { api, ApiError } from '@/lib/api';
import { getToken, clearToken } from '@/lib/auth';
import { APPLICATION_STATUSES, ApplicationStatus, JobApplication, STATUS_LABELS } from '@/lib/types';
import { CardContent } from '@/components/KanbanCard';
import { KanbanColumn } from '@/components/KanbanColumn';
import { StatsBar } from '@/components/StatsBar';

/**
 * El coordinate getter por defecto de dnd-kit mueve la tarjeta 25px por
 * pulsación de flecha — para cruzar una columna de 288px habría que apretar
 * ArrowRight más de diez veces. Este reemplazo salta directo al centro de la
 * columna siguiente/anterior, que es como se espera que funcione un tablero
 * por teclado.
 */
const columnCoordinateGetter: KeyboardCoordinateGetter = (event, { currentCoordinates, context }) => {
  const { collisionRect, droppableRects, over } = context;
  if (!collisionRect) return currentCoordinates;

  const currentIndex = over ? APPLICATION_STATUSES.indexOf(over.id as ApplicationStatus) : -1;
  if (currentIndex === -1) return currentCoordinates;

  let targetIndex = currentIndex;
  if (event.code === KeyboardCode.Right) targetIndex = Math.min(APPLICATION_STATUSES.length - 1, currentIndex + 1);
  else if (event.code === KeyboardCode.Left) targetIndex = Math.max(0, currentIndex - 1);
  else return currentCoordinates;

  if (targetIndex === currentIndex) return currentCoordinates;

  const targetRect = droppableRects.get(APPLICATION_STATUSES[targetIndex]);
  if (!targetRect) return currentCoordinates;

  event.preventDefault();
  return {
    x: currentCoordinates.x + (targetRect.left + targetRect.width / 2) - (collisionRect.left + collisionRect.width / 2),
    y: currentCoordinates.y,
  };
};

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeApp, setActiveApp] = useState<JobApplication | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnCoordinateGetter })
  );

  // dnd-kit anuncia cada paso del drag a lectores de pantalla; por defecto lo
  // hace en inglés y con el id crudo de la postulación. Lo tradujimos y
  // usamos el nombre de la empresa para que el anuncio diga algo útil.
  const accessibility = {
    screenReaderInstructions: {
      draggable:
        'Para mover esta postulación, presiona espacio o enter. ' +
        'Usa las flechas izquierda y derecha para pasarla a la columna anterior o siguiente. ' +
        'Presiona espacio o enter otra vez para soltarla ahí, o escape para cancelar.',
    },
    announcements: {
      onDragStart({ active }: { active: { id: string | number } }) {
        const app = applications.find((a) => a.id === active.id);
        return app ? `Levantaste la postulación de ${app.company}.` : 'Levantaste la postulación.';
      },
      onDragOver({ over }: { over: { id: string | number } | null }) {
        if (!over) return 'Ya no está sobre ninguna columna.';
        return `Está sobre la columna ${STATUS_LABELS[over.id as ApplicationStatus]}.`;
      },
      onDragEnd({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) {
        const app = applications.find((a) => a.id === active.id);
        const label = over ? STATUS_LABELS[over.id as ApplicationStatus] : null;
        if (app && label) return `Postulación de ${app.company} soltada en ${label}.`;
        return 'Se soltó la postulación.';
      },
      onDragCancel({ active }: { active: { id: string | number } }) {
        const app = applications.find((a) => a.id === active.id);
        return app
          ? `Se canceló el movimiento de la postulación de ${app.company}.`
          : 'Se canceló el movimiento.';
      },
    },
  };

  function loadApplications() {
    setLoading(true);
    setLoadError(null);
    api
      .get<JobApplication[]>('/applications')
      .then(setApplications)
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    loadApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  async function handleStatusChange(id: string, status: ApplicationStatus) {
    setActionError(null);
    const previous = applications;
    setApplications((apps) => apps.map((a) => (a.id === id ? { ...a, status } : a)));

    try {
      await api.put<JobApplication>(`/applications/${id}`, { status });
    } catch (err) {
      setApplications(previous);
      setActionError(err instanceof ApiError ? err.message : 'No se pudo actualizar el estado');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Borrar esta postulación? Esta acción no se puede deshacer.')) return;

    setActionError(null);
    const previous = applications;
    setApplications((apps) => apps.filter((a) => a.id !== id));

    try {
      await api.delete(`/applications/${id}`);
    } catch (err) {
      setApplications(previous);
      setActionError(err instanceof ApiError ? err.message : 'No se pudo borrar la postulación');
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveApp(applications.find((a) => a.id === event.active.id) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveApp(null);
    const { active, over } = event;
    if (!over) return;

    const newStatus = over.id as ApplicationStatus;
    const app = applications.find((a) => a.id === active.id);
    if (!app || app.status === newStatus) return;

    handleStatusChange(app.id, newStatus);
  }

  return (
    <main className="min-h-screen p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Mis postulaciones</h1>
          <div className="flex gap-2">
            <Link
              href="/applications/new"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 text-center"
            >
              + Nueva postulación
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        {loading && (
          <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-72 flex-shrink-0 animate-pulse">
                <div className="h-9 bg-gray-100 rounded-t-lg" />
                <div className="min-h-[160px] p-2 space-y-2 rounded-b-lg border border-t-0 border-gray-200 bg-gray-50">
                  <div className="h-16 bg-white border border-gray-200 rounded-lg" />
                  <div className="h-16 bg-white border border-gray-200 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        )}

        {loadError && (
          <div className="mt-6 flex items-center justify-between gap-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            <span>{loadError}</span>
            <button
              onClick={loadApplications}
              className="shrink-0 rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              Reintentar
            </button>
          </div>
        )}

        {actionError && (
          <div className="mt-6 flex items-center justify-between gap-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            <span>{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              aria-label="Cerrar mensaje de error"
              className="shrink-0 text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        {!loading && !loadError && applications.length === 0 && (
          <p className="mt-6 text-sm text-gray-500">
            Todavía no registraste ninguna postulación.
          </p>
        )}

        {!loading && !loadError && applications.length > 0 && (
          <>
            <div className="mt-6">
              <StatsBar applications={applications} />
            </div>

            <DndContext
              sensors={sensors}
              accessibility={accessibility}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0">
                {APPLICATION_STATUSES.map((status) => (
                  <KanbanColumn
                    key={status}
                    status={status}
                    applications={applications.filter((a) => a.status === status)}
                    onDelete={handleDelete}
                  />
                ))}
              </div>

              <DragOverlay>
                {activeApp && (
                  <div className="w-72 bg-white border border-gray-300 rounded-lg p-3 shadow-lg rotate-2">
                    <CardContent app={activeApp} />
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          </>
        )}
      </div>
    </main>
  );
}
