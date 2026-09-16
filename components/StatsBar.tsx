import { APPLICATION_STATUSES, JobApplication, STATUS_LABELS } from '@/lib/types';

function startOfWeek(): Date {
  const now = new Date();
  const day = now.getDay(); // 0 = domingo, 1 = lunes, ...
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function StatsBar({ applications }: { applications: JobApplication[] }) {
  const total = applications.length;
  const weekStart = startOfWeek();
  const thisWeek = applications.filter((a) => new Date(a.createdAt) >= weekStart).length;

  // "Tasa de respuesta": de las que ya se aplicaron (todo menos "Por aplicar"),
  // qué porcentaje avanzó a Entrevista u Oferta.
  const applied = applications.filter((a) => a.status !== 'POR_APLICAR');
  const advanced = applied.filter((a) => a.status === 'ENTREVISTA' || a.status === 'OFERTA');
  const responseRate = applied.length > 0 ? Math.round((advanced.length / applied.length) * 100) : null;

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        <StatTile label="Total" value={total} />
        {APPLICATION_STATUSES.map((status) => (
          <StatTile
            key={status}
            label={STATUS_LABELS[status]}
            value={applications.filter((a) => a.status === status).length}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
        <p>
          <span className="font-semibold text-gray-900">{thisWeek}</span> postulaciones esta semana
        </p>
        <p title="% de postulaciones aplicadas que avanzaron a entrevista u oferta">
          <span className="font-semibold text-gray-900">{responseRate === null ? '—' : `${responseRate}%`}</span>{' '}
          tasa de respuesta
        </p>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-md px-3 py-1.5 text-center">
      <p className="text-lg font-bold text-gray-900 leading-none">{value}</p>
      <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
