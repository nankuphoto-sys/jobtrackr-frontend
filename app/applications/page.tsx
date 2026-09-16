'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { api, ApiError } from '@/lib/api';
import { getToken, clearToken } from '@/lib/auth';
import { APPLICATION_STATUSES, ApplicationStatus, JobApplication } from '@/lib/types';
import { CardContent } from '@/components/KanbanCard';
import { KanbanColumn } from '@/components/KanbanColumn';
import { StatsBar } from '@/components/StatsBar';

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeApp, setActiveApp] = useState<JobApplication | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }

    api
      .get<JobApplication[]>('/applications')
      .then(setApplications)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se pudo conectar con el servidor'))
      .finally(() => setLoading(false));
  }, [router]);

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  async function handleStatusChange(id: string, status: ApplicationStatus) {
    const previous = applications;
    setApplications((apps) => apps.map((a) => (a.id === id ? { ...a, status } : a)));

    try {
      await api.put<JobApplication>(`/applications/${id}`, { status });
    } catch (err) {
      setApplications(previous);
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el estado');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Borrar esta postulación? Esta acción no se puede deshacer.')) return;

    const previous = applications;
    setApplications((apps) => apps.filter((a) => a.id !== id));

    try {
      await api.delete(`/applications/${id}`);
    } catch (err) {
      setApplications(previous);
      setError(err instanceof ApiError ? err.message : 'No se pudo borrar la postulación');
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

        {error && (
          <p className="mt-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        {!loading && !error && applications.length === 0 && (
          <p className="mt-6 text-sm text-gray-500">
            Todavía no registraste ninguna postulación.
          </p>
        )}

        {!loading && !error && applications.length > 0 && (
          <>
            <div className="mt-6">
              <StatsBar applications={applications} />
            </div>

            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
