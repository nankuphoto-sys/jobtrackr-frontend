import { JobApplication, StatusChange } from '@/lib/types';
import { computeStats } from '@/lib/stats';
import { computeWeeklyCounts, computeFunnel, computeAvgTimeInStatus } from '@/lib/reports';
import { STATUS_ACCENT_COLOR } from '@/lib/statusStyles';

function formatWeekLabel(date: Date): string {
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }).toUpperCase();
}

function WeeklyBarChart({ applications }: { applications: JobApplication[] }) {
  const weeks = computeWeeklyCounts(applications, 8);
  const max = Math.max(1, ...weeks.map((w) => w.count));

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[15px] font-semibold text-[color:var(--cds-text-primary)]">Postulaciones por semana</h2>
      <div className="flex items-end gap-2.5" style={{ height: 140 }}>
        {weeks.map((w, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="font-mono text-[11px] font-medium text-[color:var(--cds-text-secondary)]">
              {w.count}
            </span>
            <div
              className="w-full"
              style={{
                height: Math.max(2, (w.count / max) * 96),
                background: 'var(--cds-interactive)',
              }}
            />
            <span className="font-mono text-[9px] text-[color:var(--cds-text-secondary)]">
              {formatWeekLabel(w.weekStart)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function FunnelChart({ applications, history }: { applications: JobApplication[]; history: StatusChange[] }) {
  const { stages, rejected, rejectedPct } = computeFunnel(applications, history);
  const max = Math.max(1, ...stages.map((s) => s.count));

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[15px] font-semibold text-[color:var(--cds-text-primary)]">Embudo de conversión</h2>
      <div className="flex flex-col gap-2">
        {stages.map((stage) => (
          <div key={stage.status} className="flex items-center gap-3">
            <span className="w-[90px] shrink-0 text-[12px] text-[color:var(--cds-text-secondary)]">
              {stage.label}
            </span>
            <div className="flex-1" style={{ background: 'var(--cds-layer-accent)' }}>
              <div
                className="flex items-center px-2 py-1.5"
                style={{
                  width: `${Math.max(6, (stage.count / max) * 100)}%`,
                  background: STATUS_ACCENT_COLOR[stage.status],
                  minWidth: 'fit-content',
                }}
              >
                <span className="whitespace-nowrap font-mono text-[11px] font-semibold text-white">
                  {stage.count} · {stage.pctOfTotal}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[12px] text-[color:var(--cds-text-secondary)]">
        <span className="font-semibold" style={{ color: 'var(--cds-support-error)' }}>
          {rejected}
        </span>{' '}
        rechazadas ({rejectedPct}% del total) — no cuenta como una etapa del embudo, puede pasar desde cualquiera.
      </p>
    </section>
  );
}

function AvgTimeTable({ history }: { history: StatusChange[] }) {
  const rows = computeAvgTimeInStatus(history);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[15px] font-semibold text-[color:var(--cds-text-primary)]">Tiempo promedio por estado</h2>
      <div className="flex flex-col" style={{ borderTop: '1px solid var(--cds-border-subtle-00)' }}>
        {rows.map((row) => (
          <div
            key={row.status}
            className="flex items-center justify-between border-b py-2.5"
            style={{ borderColor: 'var(--cds-border-subtle-00)' }}
          >
            <span className="flex items-center gap-2 text-[13px] text-[color:var(--cds-text-primary)]">
              <span className="h-[7px] w-[7px] rounded-full" style={{ background: STATUS_ACCENT_COLOR[row.status] }} />
              {row.label}
            </span>
            <span className="font-mono text-[13px] text-[color:var(--cds-text-secondary)]">
              {row.avgDays === null ? '— sin datos' : `${row.avgDays.toFixed(1)} días`}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ReportsTab({
  applications,
  history,
}: {
  applications: JobApplication[];
  history: StatusChange[];
}) {
  const { total, responseRate } = computeStats(applications);

  if (total === 0) {
    return (
      <p className="py-8 text-center text-[14px] text-[color:var(--cds-text-secondary)]">
        Todavía no hay postulaciones para generar reportes.
      </p>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-8 py-6">
      <div className="flex gap-8">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] font-medium uppercase tracking-[.1em] text-[color:var(--cds-text-secondary)]">
            Total histórico
          </span>
          <span className="font-mono text-[26px] font-semibold text-[color:var(--cds-text-primary)]">{total}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] font-medium uppercase tracking-[.1em] text-[color:var(--cds-text-secondary)]">
            Tasa de respuesta
          </span>
          <span className="font-mono text-[26px] font-semibold text-[color:var(--cds-text-primary)]">
            {responseRate === null ? '—' : `${responseRate}%`}
          </span>
        </div>
      </div>

      <WeeklyBarChart applications={applications} />
      <FunnelChart applications={applications} history={history} />
      <AvgTimeTable history={history} />
    </div>
  );
}
