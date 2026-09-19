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
import {
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  Button,
  InlineNotification,
  SkeletonText,
  SkeletonPlaceholder,
} from '@carbon/react';
import { Add, Logout, UserAvatar, WarningFilled } from '@carbon/icons-react';
import { api, ApiError } from '@/lib/api';
import { getToken, clearToken, getUserEmail } from '@/lib/auth';
import { getDensity } from '@/lib/density';
import { APPLICATION_STATUSES, ApplicationStatus, JobApplication, STATUS_LABELS } from '@/lib/types';
import { computeStats } from '@/lib/stats';
import { STATUS_ACCENT_COLOR } from '@/lib/statusStyles';
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
  const [compact, setCompact] = useState(false);

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
    setCompact(getDensity() === 'densa');
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
  const hasBoard = !loading && !loadError;

  return (
    <div style={{ background: 'var(--cds-background)' }} className="min-h-screen pb-24 pt-12 sm:pb-6">
      {/* Header de Carbon es position:fixed — pt-12 (48px) en el contenedor compensa su altura. */}
      <Header aria-label="JobTrackr">
        <HeaderName href="/applications" prefix="">
          JobTrackr
        </HeaderName>
        {userEmail && (
          <span
            className="ml-auto hidden items-center pr-4 text-[13px] sm:flex"
            style={{ color: 'var(--cds-text-secondary)' }}
          >
            {userEmail}
          </span>
        )}
        <div className="hidden items-center pr-3 sm:flex">
          <Button size="sm" renderIcon={Add} onClick={() => setModalState({ mode: 'create' })}>
            Nueva postulación
          </Button>
        </div>
        <HeaderGlobalBar>
          <HeaderGlobalAction aria-label="Mi cuenta" onClick={() => router.push('/account')}>
            <UserAvatar size={20} />
          </HeaderGlobalAction>
          <HeaderGlobalAction aria-label="Cerrar sesión" onClick={handleLogout}>
            <Logout size={20} />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>

      <div className="mx-auto max-w-[1180px]">
        {hasBoard && applications.length > 0 && (
          <>
            <div className="hidden sm:block" data-testid="stats-desktop">
              <StatsBar applications={applications} />
            </div>
            <div
              className="flex gap-4 border-b px-3.5 py-3 sm:hidden"
              style={{ borderColor: 'var(--cds-border-subtle-00)' }}
              data-testid="stats-mobile"
            >
              <MobileMetric label="Total" value={applications.length} />
              <MobileMetric label="Semana" value={thisWeek} />
              <MobileMetric label="Respuesta" value={responseRate === null ? '—' : `${responseRate}%`} />
            </div>
          </>
        )}

        {actionError && (
          <div className="px-3.5 pt-3.5 sm:px-5 sm:pt-4">
            <InlineNotification
              kind="error"
              title={actionError}
              lowContrast
              onClose={() => setActionError(null)}
              aria-label="Cerrar mensaje de error"
            />
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
            <div
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory p-3.5 sm:grid sm:grid-cols-[repeat(5,minmax(190px,1fr))] sm:gap-3 sm:p-[18px]"
              style={{ background: 'var(--cds-layer)' }}
            >
              {APPLICATION_STATUSES.map((status) => (
                <div key={status} className="w-[82vw] max-w-[320px] shrink-0 snap-start sm:w-auto sm:max-w-none">
                  <KanbanColumn
                    status={status}
                    applications={applications.filter((a) => a.status === status)}
                    onEdit={(app) => setModalState({ mode: 'edit', app })}
                    activeApp={activeApp}
                    compact={compact}
                  />
                </div>
              ))}
            </div>

            <DragOverlay>
              {activeApp && (
                <div
                  className="w-[230px] -rotate-2 scale-[1.03] border p-3 shadow-[0_14px_28px_rgba(17,24,39,.18)]"
                  style={{ borderColor: 'var(--cds-border-strong-01)', background: 'var(--cds-layer)' }}
                >
                  <CardContent app={activeApp} />
                  {overStatus && overStatus !== activeApp.status && (
                    <p
                      className="mt-1.5 font-mono text-[10px] font-medium uppercase tracking-[.1em]"
                      style={{ color: STATUS_ACCENT_COLOR[overStatus] }}
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
        <div
          className="fixed inset-x-0 bottom-0 border-t p-3.5 sm:hidden"
          style={{ borderColor: 'var(--cds-border-subtle-00)', background: 'var(--cds-layer)' }}
        >
          <Button renderIcon={Add} onClick={() => setModalState({ mode: 'create' })} className="w-full justify-center">
            Nueva postulación
          </Button>
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
    </div>
  );
}

function MobileMetric({
  label,
  value,
  valueColor = 'var(--cds-text-primary)',
}: {
  label: string;
  value: string | number;
  valueColor?: string;
}) {
  return (
    <span className="flex flex-col gap-1">
      <span className="font-mono text-[9px] font-medium uppercase tracking-[.1em] text-[color:var(--cds-text-secondary)]">
        {label}
      </span>
      <span className="font-mono text-[18px] font-semibold leading-none" style={{ color: valueColor }}>
        {value}
      </span>
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-3.5 sm:p-[18px]" style={{ background: 'var(--cds-layer)' }}>
      <SkeletonText width="140px" />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <SkeletonText width="60%" />
            <SkeletonPlaceholder className="!h-[62px] !w-full" />
            <SkeletonPlaceholder className="!h-[62px] !w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-11 text-center">
      <WarningFilled size={36} style={{ color: 'var(--cds-support-error)' }} />
      <div className="flex flex-col gap-2">
        <span className="text-[17px] font-semibold leading-[1.25] text-[color:var(--cds-text-primary)]">
          No pudimos cargar el tablero
        </span>
        <p className="max-w-[32ch] text-[14px] leading-[1.5] text-[color:var(--cds-text-secondary)]">
          La conexión con el servidor falló. Tus postulaciones siguen guardadas.
        </p>
        <span className="font-mono text-[11px] text-[color:var(--cds-text-secondary)]">{message}</span>
      </div>
      <Button kind="tertiary" onClick={onRetry}>
        Reintentar
      </Button>
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
            className="h-[34px] w-[22px] border"
            style={{
              borderStyle: i === 2 ? 'solid' : 'dashed',
              borderColor: i === 2 ? 'var(--cds-border-strong-01)' : 'var(--cds-border-subtle-01)',
            }}
          />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-[17px] font-semibold leading-[1.25] text-[color:var(--cds-text-primary)]">
          Tu tablero está vacío
        </span>
        <p className="max-w-[30ch] text-[14px] leading-[1.5] text-[color:var(--cds-text-secondary)]">
          Registra la primera vacante y arrástrala entre columnas a medida que avance el proceso.
        </p>
      </div>
      <Button renderIcon={Add} onClick={onCreate}>
        Crear la primera
      </Button>
    </div>
  );
}
