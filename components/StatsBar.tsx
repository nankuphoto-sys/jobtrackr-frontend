import { APPLICATION_STATUSES, JobApplication } from '@/lib/types';
import { STATUS_ACCENT_COLOR } from '@/lib/statusStyles';
import { computeStats } from '@/lib/stats';

export function StatsBar({ applications }: { applications: JobApplication[] }) {
  const { total, thisWeek, responseRate } = computeStats(applications);

  return (
    <div
      className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-px border-b"
      style={{ borderColor: 'var(--cds-border-subtle-00)', background: 'var(--cds-border-subtle-00)' }}
    >
      <Metric label="Total" value={total} />
      <Metric label="Esta semana" value={thisWeek} />
      <Metric label="Tasa de respuesta" value={responseRate === null ? '—' : `${responseRate}%`} />
      <div
        className="col-span-2 flex flex-col gap-[9px] px-[18px] py-[14px]"
        style={{ background: 'var(--cds-layer)' }}
      >
        <span className="font-mono text-[10px] font-medium uppercase tracking-[.1em] text-[color:var(--cds-text-secondary)]">
          Por estado
        </span>
        <div className="flex flex-wrap gap-[14px]">
          {APPLICATION_STATUSES.map((status) => (
            <span
              key={status}
              className="flex items-center gap-1.5 font-mono text-[13px] font-medium text-[color:var(--cds-text-primary)]"
            >
              <span className="h-[7px] w-[7px] rounded-full" style={{ background: STATUS_ACCENT_COLOR[status] }} />
              {applications.filter((a) => a.status === status).length}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  valueColor = 'var(--cds-text-primary)',
}: {
  label: string;
  value: number | string;
  valueColor?: string;
}) {
  return (
    <div className="flex flex-col gap-[7px] px-[18px] py-[14px]" style={{ background: 'var(--cds-layer)' }}>
      <span className="font-mono text-[10px] font-medium uppercase tracking-[.1em] text-[color:var(--cds-text-secondary)]">
        {label}
      </span>
      <span className="font-mono text-[26px] font-semibold leading-none tracking-[-.02em]" style={{ color: valueColor }}>
        {value}
      </span>
    </div>
  );
}
