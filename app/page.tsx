'use client';

import Link from 'next/link';
import { Button, Tile } from '@carbon/react';
import { Dashboard, ChartLine, Mobile, Rocket } from '@carbon/icons-react';
import { APPLICATION_STATUSES, STATUS_LABELS } from '@/lib/types';
import { STATUS_ACCENT_COLOR } from '@/lib/statusStyles';

const PREVIEW_COUNTS: Record<string, number> = {
  POR_APLICAR: 4,
  APLICADO: 9,
  ENTREVISTA: 4,
  OFERTA: 2,
  RECHAZADO: 5,
};

const BENEFITS = [
  {
    icon: Dashboard,
    title: 'Tablero Kanban',
    body: 'Arrastra cada postulación entre 5 estados, de "Por aplicar" a "Oferta", sin perder de vista nada.',
  },
  {
    icon: ChartLine,
    title: 'Métricas reales',
    body: 'Tasa de respuesta, embudo de conversión y tiempo promedio en cada etapa del proceso.',
  },
  {
    icon: Mobile,
    title: 'Mobile-first',
    body: 'Pensado primero para el celular: el tablero se vuelve swipeable, no solo "también funciona".',
  },
  {
    icon: Rocket,
    title: 'Gratis, para siempre',
    body: 'Sin límites de postulaciones ni tarjeta de crédito. Es una herramienta, no un producto que vender.',
  },
];

export default function Home() {
  return (
    <main style={{ background: 'var(--cds-background)' }}>
      {/* Hero */}
      <section className="flex flex-col items-center gap-5 px-4 py-20 text-center sm:py-28">
        <span
          className="grid h-[30px] w-[30px] place-items-center font-mono text-[14px] font-semibold"
          style={{ background: 'var(--cds-text-primary)', color: 'var(--cds-background)' }}
        >
          J
        </span>
        <h1 className="max-w-2xl text-[32px] font-semibold leading-tight tracking-[-.02em] text-[color:var(--cds-text-primary)] sm:text-[44px]">
          Tu búsqueda de empleo, en un solo tablero
        </h1>
        <p className="max-w-md text-[16px] leading-[1.5] text-[color:var(--cds-text-secondary)]">
          JobTrackr organiza tus postulaciones de empleo en un Kanban simple, con métricas para saber si tu
          estrategia está funcionando.
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Button as={Link} href="/register" size="lg">
            Crear cuenta gratis
          </Button>
          <Button as={Link} href="/login" kind="secondary" size="lg">
            Iniciar sesión
          </Button>
        </div>
      </section>

      {/* Beneficios */}
      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-4 pb-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {BENEFITS.map(({ icon: Icon, title, body }) => (
          <Tile key={title}>
            <div className="flex flex-col gap-3">
              <Icon size={24} style={{ color: 'var(--cds-icon-primary)' }} />
              <span className="text-[15px] font-semibold text-[color:var(--cds-text-primary)]">{title}</span>
              <span className="text-[13px] leading-[1.45] text-[color:var(--cds-text-secondary)]">{body}</span>
            </div>
          </Tile>
        ))}
      </section>

      {/* Preview del tablero */}
      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        <div className="border p-1" style={{ borderColor: 'var(--cds-border-subtle-01)' }}>
          <div
            className="grid grid-cols-5 gap-2 p-4"
            style={{ background: 'var(--cds-layer)' }}
          >
            {APPLICATION_STATUSES.map((status) => (
              <div key={status} className="flex flex-col gap-2">
                <div
                  className="flex items-center justify-between border-b-2 pb-1.5"
                  style={{ borderColor: STATUS_ACCENT_COLOR[status] }}
                >
                  <span className="font-mono text-[9px] font-semibold uppercase tracking-[.06em] text-[color:var(--cds-text-primary)]">
                    {STATUS_LABELS[status]}
                  </span>
                  <span className="font-mono text-[9px] text-[color:var(--cds-text-secondary)]">
                    {PREVIEW_COUNTS[status]}
                  </span>
                </div>
                <div className="h-16 border" style={{ borderColor: 'var(--cds-border-subtle-00)', background: 'var(--cds-background)' }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="flex flex-col items-center gap-4 px-4 pb-20 text-center">
        <h2 className="text-[22px] font-semibold text-[color:var(--cds-text-primary)]">
          Empieza a organizar tu búsqueda hoy
        </h2>
        <Button as={Link} href="/register" size="lg">
          Crear cuenta gratis
        </Button>
      </section>

      <footer
        className="border-t px-4 py-6 text-center text-[12px]"
        style={{ borderColor: 'var(--cds-border-subtle-00)', color: 'var(--cds-text-secondary)' }}
      >
        JobTrackr — proyecto de portafolio.
      </footer>
    </main>
  );
}
