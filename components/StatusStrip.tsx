import { APPLICATION_STATUSES, JobApplication, STATUS_LABELS } from '@/lib/types';
import { STATUS_ACCENT_COLOR } from '@/lib/statusStyles';

/**
 * Franja de 4px al pie del header: la rampa de estados de la landing, con cada
 * tramo proporcional a cuántas postulaciones hay en ese estado. Se lee de un
 * vistazo si la búsqueda está atascada en "Aplicado" o avanzando hacia "Oferta".
 * Sin postulaciones cae a gris. Para lectores de pantalla es una imagen con los
 * conteos en su nombre; con mouse, cada tramo tiene su tooltip nativo.
 */
export function StatusStrip({ applications }: { applications: JobApplication[] }) {
  const counts = APPLICATION_STATUSES.map((status) => ({
    status,
    n: applications.filter((a) => a.status === status).length,
  }));
  const label = `Postulaciones por estado: ${counts.map(({ status, n }) => `${STATUS_LABELS[status]} ${n}`).join(', ')}`;

  return (
    <div role="img" aria-label={label} className="absolute inset-x-0 bottom-0 flex h-1">
      {applications.length === 0 ? (
        <span className="flex-1" style={{ background: 'var(--cds-border-subtle-01)' }} />
      ) : (
        counts
          .filter(({ n }) => n > 0)
          .map(({ status, n }) => (
            <span
              key={status}
              title={`${STATUS_LABELS[status]}: ${n}`}
              className="motion-safe:transition-[flex-grow] motion-safe:duration-300"
              style={{ flexGrow: n, flexBasis: 0, background: STATUS_ACCENT_COLOR[status] }}
            />
          ))
      )}
    </div>
  );
}
