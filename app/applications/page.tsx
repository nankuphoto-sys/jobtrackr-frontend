'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragCancelEvent,
  DragEndEvent,
  DragOverEvent,
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
import { getToken, clearToken, getUserEmail } from '@/lib/auth';
import { APPLICATION_STATUSES, ApplicationStatus, JobApplication, STATUS_LABELS } from '@/lib/types';
import { computeStats } from '@/lib/stats';
import { STATUS_ACCENT_TEXT_CLASS } from '@/lib/statusStyles';
import { CardContent } from '@/components/KanbanCard';
import { KanbanColumn } from '@/components/KanbanColumn';
import { StatsBar } from '@/components/StatsBar';
import { ApplicationModal } from '@/components/ApplicationModal';

type ModalState = { mode: 'create' } | { mode: 'edit'; app: JobApplication } | null;

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
  const [overStatus, setOverStatus] = useState<ApplicationStatus | null>(null);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

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
    setUserEmail(getUserEmail());
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

  function handleSaved(saved: JobApplication) {
    setApplications((apps) => (apps.some((a) => a.id === saved.id) ? apps.map((a) => (a.id === saved.id ? saved : a)) : [...apps, saved]));
    setModalState(null);
  }

  function handleDeleted(id: string) {
    setApplications((apps) => apps.filter((a) => a.id !== id));
    setModalState(null);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveApp(applications.find((a) => a.id === event.active.id) ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    setOverStatus((event.over?.id as ApplicationStatus | undefined) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveApp(null);
    setOverStatus(null);
    const { active, over } = event;
    if (!over) return;

    const newStatus = over.id as ApplicationStatus;
    const app = applications.find((a) => a.id === active.id);
    if (!app || app.status === newStatus) return;

    handleStatusChange(app.id, newStatus);
  }

  function handleDragCancel(_event: DragCancelEvent) {
    setActiveApp(null);
    setOverStatus(null);
  }

  const { thisWeek, responseRate } = computeStats(applications);
  const initials = (userEmail ?? 'JT').slice(0, 2).toUpperCase();
  const hasBoard = !loading && !loadError;

  return (
    <main className="min-h-screen bg-page pb-24 sm:pb-6 sm:p-6">
      <div className="mx-auto max-w-[1180px] bg-surface sm:border sm:border-line-strong">
        {/* Topbar — desktop */}
        <header className="hidden items-center justify-between gap-4 border-b border-line px-5 py-3.5 sm:flex">
          <div className="flex items-center gap-2.5">
            <span className="grid h-[22px] w-[22px] place-items-center bg-ink font-mono text-[12px] font-semibold text-white">
              J
            </span>
            <span className="text-[15px] font-semibold tracking-[-.01em] text-ink">JobTrackr</span>
          </div>
          <div className="flex items-center gap-3">
            {userEmail && <span className="text-[13px] text-ink-3">{userEmail}</span>}
            <span className="h-5 w-px bg-line" />
            <button
              onClick={handleLogout}
              className="px-0.5 py-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink"
            >
              Salir
            </button>
            <button
              onClick={() => setModalState({ mode: 'create' })}
              className="flex items-center gap-1.5 bg-ink px-3.5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-ink-2"
            >
              <span className="font-mono text-[15px] leading-none">+</span>Nueva postulación
            </button>
          </div>
        </header>

        {/* Topbar — mobile */}
        <header className="flex items-center justify-between border-b border-line px-3.5 py-3 sm:hidden">
          <div className="flex items-center gap-2">
            <span className="grid h-5 w-5 place-items-center bg-ink font-mono text-[11px] font-semibold text-white">
              J
            </span>
            <span className="text-[14px] font-semibold text-ink">JobTrackr</span>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            className="grid h-7 w-7 place-items-center border border-line text-[12px] font-medium text-ink-3"
          >
            {initials}
          </button>
        </header>

        {hasBoard && applications.length > 0 && (
          <>
            <div className="hidden sm:block" data-testid="stats-desktop">
              <StatsBar applications={applications} />
            </div>
            <div className="flex gap-4 border-b border-line px-3.5 py-3 sm:hidden" data-testid="stats-mobile">
              <MobileMetric label="Total" value={applications.length} />
              <MobileMetric label="Semana" value={thisWeek} />
              <MobileMetric
                label="Respuesta"
                value={responseRate === null ? '—' : `${responseRate}%`}
                valueClassName="text-status-oferta"
              />
            </div>
          </>
        )}

        {actionError && (
          <div className="mx-3.5 mt-3.5 flex items-center justify-between gap-3 border border-l-[3px] border-status-rechazado bg-status-rechazado-bg px-3 py-2 sm:mx-5 sm:mt-4">
            <span className="text-[13px] font-medium text-status-rechazado-text">{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              aria-label="Cerrar mensaje de error"
              className="shrink-0 text-status-rechazado-text hover:opacity-70"
            >
              ✕
            </button>
          </div>
        )}

        {loading && <LoadingSkeleton />}

        {!loading && loadError && <ErrorState message={loadError} onRetry={loadApplications} />}

        {hasBoard && applications.length === 0 && (
          <EmptyState onCreate={() => setModalState({ mode: 'create' })} />
        )}

        {hasBoard && applications.length > 0 && (
          <DndContext
            sensors={sensors}
            accessibility={accessibility}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory bg-canvas p-3.5 sm:grid sm:grid-cols-[repeat(5,minmax(190px,1fr))] sm:gap-3 sm:p-[18px]">
              {APPLICATION_STATUSES.map((status) => (
                <div key={status} className="w-[82vw] max-w-[320px] shrink-0 snap-start sm:w-auto sm:max-w-none">
                  <KanbanColumn
                    status={status}
                    applications={applications.filter((a) => a.status === status)}
                    onEdit={(app) => setModalState({ mode: 'edit', app })}
                    activeApp={activeApp}
                  />
                </div>
              ))}
            </div>

            <DragOverlay>
              {activeApp && (
                <div className="w-[230px] -rotate-2 scale-[1.03] border border-ink bg-surface p-3 shadow-drag">
                  <CardContent app={activeApp} />
                  {overStatus && overStatus !== activeApp.status && (
                    <p
                      className={`mt-1.5 font-mono text-[10px] font-medium uppercase tracking-[.1em] ${STATUS_ACCENT_TEXT_CLASS[overStatus]}`}
                    >
                      Moviendo → {STATUS_LABELS[overStatus]}
                    </p>
                  )}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {hasBoard && (
        <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface p-3.5 sm:hidden">
          <button
            onClick={() => setModalState({ mode: 'create' })}
            className="w-full bg-ink px-4 py-3.5 text-[14px] font-semibold text-white transition-colors hover:bg-ink-2"
          >
            + Nueva postulación
          </button>
        </div>
      )}

      {modalState && (
        <ApplicationModal
          app={modalState.mode === 'edit' ? modalState.app : null}
          onClose={() => setModalState(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
    </main>
  );
}

function MobileMetric({
  label,
  value,
  valueClassName = 'text-ink',
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <span className="flex flex-col gap-1">
      <span className="font-mono text-[9px] font-medium uppercase tracking-[.1em] text-muted">{label}</span>
      <span className={`font-mono text-[18px] font-semibold leading-none ${valueClassName}`}>{value}</span>
    </span>
  );
}

function LoadingSkeleton() {
  const delays = [0, 0.1, 0.15, 0.2, 0.25, 0.35];
  return (
    <div className="flex flex-col gap-3 bg-canvas p-3.5 sm:p-[18px]">
      <span className="font-mono text-[10px] font-medium uppercase tracking-[.1em] text-muted">Cargando</span>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-2">
          <span className="h-2.5 w-[60%] animate-shimmer bg-line" style={{ animationDelay: `${delays[0]}s` }} />
          <span className="h-[62px] animate-shimmer bg-line" style={{ animationDelay: `${delays[1]}s` }} />
          <span className="h-[62px] animate-shimmer bg-[#eceef1]" style={{ animationDelay: `${delays[2]}s` }} />
        </div>
        <div className="flex flex-col gap-2">
          <span className="h-2.5 w-[45%] animate-shimmer bg-line" style={{ animationDelay: `${delays[3]}s` }} />
          <span className="h-[62px] animate-shimmer bg-[#eceef1]" style={{ animationDelay: `${delays[4]}s` }} />
          <span className="h-[62px] animate-shimmer bg-line" style={{ animationDelay: `${delays[5]}s` }} />
        </div>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-11 text-center">
      <span className="grid h-9 w-9 place-items-center border border-status-rechazado font-mono text-[18px] font-semibold text-status-rechazado">
        !
      </span>
      <div className="flex flex-col gap-2">
        <span className="text-[17px] font-semibold leading-[1.25] text-ink">No pudimos cargar el tablero</span>
        <p className="max-w-[32ch] text-[14px] leading-[1.5] text-muted">
          La conexión con el servidor falló. Tus postulaciones siguen guardadas.
        </p>
        <span className="font-mono text-[11px] text-muted">{message}</span>
      </div>
      <button
        onClick={onRetry}
        className="border border-ink bg-surface px-[18px] py-3 text-[13px] font-semibold text-ink transition-colors hover:bg-ink hover:text-white"
      >
        Reintentar
      </button>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-11 text-center">
      <div className="flex gap-[5px]">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`h-[34px] w-[22px] ${i === 2 ? 'border border-ink' : 'border border-dashed border-line-strong'}`}
          />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[17px] font-semibold leading-[1.25] text-ink">Tu tablero está vacío</span>
        <p className="max-w-[30ch] text-[14px] leading-[1.5] text-muted">
          Registra la primera vacante y arrástrala entre columnas a medida que avance el proceso.
        </p>
      </div>
      <button
        onClick={onCreate}
        className="bg-ink px-[18px] py-3 text-[13px] font-semibold text-white transition-colors hover:bg-ink-2"
      >
        + Crear la primera
      </button>
    </div>
  );
}
