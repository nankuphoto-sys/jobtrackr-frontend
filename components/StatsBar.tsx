import { APPLICATION_STATUSES, JobApplication } from '@/lib/types';
import { STATUS_DOT_CLASS } from '@/lib/statusStyles';
import { computeStats } from '@/lib/stats';

export function StatsBar({ applications }: { applications: JobApplication[] }) {
  const { total, thisWeek, responseRate } = computeStats(applications);

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-px border-b border-line bg-line">
      <Metric label="Total" value={total} />
      <Metric label="Esta semana" value={thisWeek} />
      <Metric
        label="Tasa de respuesta"
        value={responseRate === null ? '—' : `${responseRate}%`}
        valueClassName="text-status-oferta"
      />
      <div className="col-span-2 flex flex-col gap-[9px] bg-surface px-[18px] py-[14px]">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[.1em] text-muted">Por estado</span>
        <div className="flex flex-wrap gap-[14px]">
          {APPLICATION_STATUSES.map((status) => (
            <span key={status} className="flex items-center gap-1.5 font-mono text-[13px] font-medium text-ink-2">
              <span className={`h-[7px] w-[7px] ${STATUS_DOT_CLASS[status]}`} />
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
  valueClassName = 'text-ink',
}: {
  label: string;
  value: number | string;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-[7px] bg-surface px-[18px] py-[14px]">
      <span className="font-mono text-[10px] font-medium uppercase tracking-[.1em] text-muted">{label}</span>
      <span className={`font-mono text-[26px] font-semibold leading-none tracking-[-.02em] ${valueClassName}`}>
        {value}
      </span>
    </div>
  );
}
