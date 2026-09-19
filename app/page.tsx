'use client';

import Link from 'next/link';
import { APPLICATION_STATUSES, ApplicationStatus, STATUS_LABELS } from '@/lib/types';
import { STATUS_ACCENT_COLOR, STATUS_SOFT_BG, STATUS_CHIP_TEXT } from '@/lib/statusStyles';

const INK = '#111827';
const INK_2 = '#374151';
const INK_3 = '#4b5563';
const MUTED = '#6b7280';
const LINE = '#e5e7eb';
const LINE_STRONG = '#d1d5db';

const STATE_DESCRIPTIONS: Record<ApplicationStatus, string> = {
  POR_APLICAR: 'Vacantes guardadas antes de que se te olviden.',
  APLICADO: 'Con fecha, link y las notas que escribiste.',
  ENTREVISTA: 'Lo que de verdad hay que preparar ahora.',
  OFERTA: 'El final de la rampa, y por qué vale seguir.',
  RECHAZADO: 'Se archivan, no se borran. Sirven de referencia.',
};

const BOARD_MOCK: Record<ApplicationStatus, { count: string; cards: { company: string; role: string }[] }> = {
  POR_APLICAR: { count: '04', cards: [{ company: 'Rappi', role: 'Frontend Jr' }, { company: 'Globant', role: 'React Developer' }] },
  APLICADO: {
    count: '09',
    cards: [
      { company: 'Mercado Libre', role: 'Frontend Jr' },
      { company: 'Nubank', role: 'Software Eng I' },
      { company: 'Tul', role: 'Desarrollador Web' },
    ],
  },
  ENTREVISTA: { count: '04', cards: [{ company: 'Bancolombia', role: 'Frontend Developer' }] },
  OFERTA: { count: '02', cards: [{ company: 'Mozilla', role: 'Junior Web Dev' }] },
  RECHAZADO: { count: '05', cards: [{ company: 'Spotify', role: 'Frontend Engineer' }, { company: 'Coderhouse', role: 'Tutor Frontend' }] },
};

const FAQ: { q: string; a: string }[] = [
  {
    q: '¿Puedo cambiar los cinco estados?',
    a: 'No, y es a propósito. Cinco columnas fijas es lo que evita que el tablero se convierta en otro proyecto por organizar.',
  },
  {
    q: '¿Qué pasa con mis datos?',
    a: 'Son tuyos. No se comparten con empresas ni reclutadores, y puedes exportarlos o borrar la cuenta cuando quieras.',
  },
  {
    q: '¿Funciona en el teléfono?',
    a: 'Sí. En móvil las columnas se recorren de lado y el estado se cambia desde la tarjeta, sin arrastrar.',
  },
  {
    q: '¿Me va a llenar el correo de recordatorios?',
    a: 'No enviamos nada que no pidas. El tablero está ahí cuando lo abres; no te persigue.',
  },
];

function Eyebrow({ children, onGray = false }: { children: React.ReactNode; onGray?: boolean }) {
  return (
    <span
      className="font-mono text-[11px] font-medium uppercase leading-none tracking-[.14em]"
      style={{ color: onGray ? INK_3 : MUTED }}
    >
      {children}
    </span>
  );
}

function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <span
      className="grid place-items-center font-mono font-semibold text-white"
      style={{ width: size, height: size, background: INK, fontSize: size * 0.545, lineHeight: `${size}px` }}
    >
      J
    </span>
  );
}

export default function Home() {
  return (
    <main className="flex justify-center px-5 pb-16 pt-7" style={{ background: '#f3f4f6' }}>
      <div className="w-full max-w-[1180px] border bg-white" style={{ borderColor: LINE_STRONG }}>
        {/* NAV */}
        <nav
          className="flex flex-wrap items-center justify-between gap-4 border-b px-7 py-4"
          style={{ borderColor: LINE }}
        >
          <span className="flex items-center gap-2.5">
            <BrandMark />
            <span className="text-[15px] font-semibold leading-none tracking-[-.01em]">JobTrackr</span>
          </span>
          <span className="flex flex-wrap items-center gap-[18px]">
            <a href="#como" className="text-[13px] font-medium no-underline transition-colors hover:text-[#111827]" style={{ color: INK_3 }}>
              Cómo funciona
            </a>
            <a href="#estados" className="text-[13px] font-medium no-underline transition-colors hover:text-[#111827]" style={{ color: INK_3 }}>
              Estados
            </a>
            <a href="#precio" className="text-[13px] font-medium no-underline transition-colors hover:text-[#111827]" style={{ color: INK_3 }}>
              Precio
            </a>
            <span className="h-[18px] w-px" style={{ background: LINE }} />
            <Link href="/login" className="text-[13px] font-medium transition-colors hover:text-[#111827]" style={{ color: INK_3 }}>
              Entrar
            </Link>
            <Link
              href="/register"
              className="px-3.5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#374151]"
              style={{ background: INK }}
            >
              Crear cuenta
            </Link>
          </span>
        </nav>

        {/* HERO */}
        <div className="flex flex-col items-center gap-6 px-7 pb-[78px] pt-[86px] text-center">
          <Eyebrow>Gratis · sin tarjeta</Eyebrow>
          <h1
            className="m-0 max-w-[19ch] text-balance font-semibold"
            style={{ fontSize: 'clamp(38px,6.4vw,76px)', lineHeight: 1.02, letterSpacing: '-.035em' }}
          >
            Deja de buscar en qué correo quedó esa vacante.
          </h1>
          <p className="m-0 max-w-[52ch] text-pretty text-[17px] leading-[1.55]" style={{ color: INK_2 }}>
            Un tablero para todas tus postulaciones. Arrastra cada vacante entre cinco estados y sabe en un vistazo
            dónde estás parado.
          </p>
          <span className="flex flex-wrap justify-center gap-2.5">
            <Link
              href="/register"
              className="px-6 py-[15px] text-[14px] font-semibold text-white transition-colors hover:bg-[#374151]"
              style={{ background: INK }}
            >
              Crear mi tablero
            </Link>
            <a
              href="#como"
              className="border px-[23px] py-3.5 text-[14px] font-semibold no-underline transition-colors hover:border-[#111827] hover:text-[#111827]"
              style={{ borderColor: LINE_STRONG, color: INK_2 }}
            >
              Ver cómo funciona
            </a>
          </span>
        </div>

        {/* FRANJA DE RAMPA */}
        <div className="flex flex-col gap-2.5 border-t px-7 py-5" style={{ borderColor: LINE }}>
          <span className="flex gap-[3px]">
            {APPLICATION_STATUSES.map((status) => (
              <span key={status} className="h-[5px] flex-1" style={{ background: STATUS_ACCENT_COLOR[status] }} />
            ))}
          </span>
          <span className="flex gap-[3px] font-mono text-[10px] font-medium uppercase tracking-[.08em]" style={{ color: INK_3 }}>
            {APPLICATION_STATUSES.map((status) => (
              <span key={status} className="min-w-0 flex-1 truncate">
                {STATUS_LABELS[status]}
              </span>
            ))}
          </span>
        </div>

        {/* CÓMO FUNCIONA */}
        <section id="como" className="flex flex-col gap-8 border-t px-7 py-16" style={{ borderColor: LINE }}>
          <div className="flex flex-col gap-2.5">
            <Eyebrow>Cómo funciona</Eyebrow>
            <h2
              className="m-0 max-w-[22ch] font-semibold"
              style={{ fontSize: 'clamp(26px,3.4vw,40px)', lineHeight: 1.08, letterSpacing: '-.025em' }}
            >
              Tres pasos, y ya estás al día.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 [grid-template-columns:repeat(auto-fit,minmax(250px,1fr))]">
            {[
              {
                n: '01',
                title: 'Registra la vacante',
                body: 'Empresa, cargo, link y la fecha. Treinta segundos, antes de que la pestaña se pierda entre otras veinte.',
              },
              {
                n: '02',
                title: 'Arrástrala cuando avance',
                body: '¿Te llamaron? La mueves a Entrevista. El tablero es el registro; no hay que actualizar nada más.',
              },
              {
                n: '03',
                title: 'Mira dónde empujar',
                body: 'Cuántas van, cuántas respondieron, qué lleva dos semanas quieto. La columna más flaca te dice qué hacer hoy.',
              },
            ].map((step) => (
              <div key={step.n} className="flex flex-col gap-2.5 border-t pt-[18px]" style={{ borderColor: INK }}>
                <span className="font-mono text-[12px] font-semibold tracking-[.1em]" style={{ color: MUTED }}>
                  {step.n}
                </span>
                <span className="text-[18px] font-semibold leading-[1.25]">{step.title}</span>
                <p className="m-0 text-pretty text-[14px] leading-[1.55]" style={{ color: INK_2 }}>
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CAPTURA DEL TABLERO */}
        <section className="flex flex-col gap-[26px] border-t px-7 py-14" style={{ borderColor: LINE, background: '#fafafa' }}>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="flex flex-col gap-2.5">
              <Eyebrow onGray>El tablero</Eyebrow>
              <h2
                className="m-0 max-w-[20ch] font-semibold"
                style={{ fontSize: 'clamp(26px,3.4vw,40px)', lineHeight: 1.08, letterSpacing: '-.025em' }}
              >
                Todo el proceso en una pantalla.
              </h2>
            </div>
            <p className="m-0 max-w-[40ch] text-pretty text-[14px] leading-[1.55]" style={{ color: INK_2 }}>
              Sin tableros que configurar ni campos que inventar. Abres y ya está armado para buscar empleo.
            </p>
          </div>

          <div
            role="img"
            aria-label="Vista previa del tablero de JobTrackr: cinco columnas por estado con postulaciones de ejemplo."
            className="border bg-white"
            style={{ borderColor: LINE_STRONG }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-[11px]" style={{ borderColor: LINE }}>
              <span className="flex items-center gap-2">
                <BrandMark size={18} />
                <span className="text-[13px] font-semibold leading-none">Mi tablero</span>
              </span>
              <span className="flex flex-wrap gap-4">
                {[
                  ['Total', '24'],
                  ['Semana', '5'],
                  ['Respuesta', '38%'],
                ].map(([label, value]) => (
                  <span key={label} className="flex items-baseline gap-1.5">
                    <span className="font-mono text-[9px] font-medium uppercase leading-none tracking-[.1em]" style={{ color: MUTED }}>
                      {label}
                    </span>
                    <span className="font-mono text-[14px] font-semibold leading-none">{value}</span>
                  </span>
                ))}
              </span>
            </div>

            <div className="overflow-x-auto p-4" style={{ background: '#fafafa' }}>
              <div className="grid min-w-[640px] grid-cols-5 gap-2.5">
                {APPLICATION_STATUSES.map((status) => (
                  <div key={status} className="flex min-w-0 flex-col gap-2">
                    <span
                      className="flex items-center gap-1.5 border-b-2 pb-1.5"
                      style={{ borderColor: STATUS_ACCENT_COLOR[status] }}
                    >
                      <span className="flex-1 truncate font-mono text-[10px] font-semibold uppercase tracking-[.07em]">
                        {STATUS_LABELS[status]}
                      </span>
                      <span className="font-mono text-[10px]" style={{ color: INK_3 }}>
                        {BOARD_MOCK[status].count}
                      </span>
                    </span>

                    {BOARD_MOCK[status].cards.map((card) => {
                      const isFocal = status === 'ENTREVISTA' && card.company === 'Bancolombia';
                      return (
                        <article
                          key={card.company}
                          className="flex min-w-0 flex-col gap-1 border bg-white p-2.5"
                          style={{
                            borderColor: isFocal ? INK : LINE,
                            borderLeft: status === 'OFERTA' ? `3px solid ${STATUS_ACCENT_COLOR.OFERTA}` : undefined,
                            opacity: status === 'RECHAZADO' ? 0.72 : 1,
                            transform: isFocal ? 'rotate(-1.5deg)' : undefined,
                            boxShadow: isFocal ? '0 12px 24px rgba(17,24,39,.16)' : undefined,
                          }}
                        >
                          <span className="truncate text-[13px] font-semibold leading-[1.2]">{card.company}</span>
                          <span className={`text-[11px] leading-[1.3] ${isFocal ? '' : 'truncate'}`} style={{ color: INK_3 }}>
                            {card.role}
                          </span>
                        </article>
                      );
                    })}

                    {status === 'ENTREVISTA' && (
                      <span
                        className="grid h-11 place-items-center border-2 border-dashed font-mono text-[9px] font-medium uppercase tracking-[.1em]"
                        style={{ borderColor: STATUS_ACCENT_COLOR.ENTREVISTA, background: STATUS_SOFT_BG.ENTREVISTA, color: STATUS_CHIP_TEXT.ENTREVISTA }}
                      >
                        Soltar aquí
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <span className="font-mono text-[12px]" style={{ color: INK_3 }}>
            Vista de escritorio. En móvil las columnas se recorren de lado.
          </span>
        </section>

        {/* LOS CINCO ESTADOS */}
        <section id="estados" className="flex flex-col gap-[30px] border-t px-7 py-16" style={{ borderColor: LINE }}>
          <div className="flex flex-col gap-2.5">
            <Eyebrow>Los estados</Eyebrow>
            <h2
              className="m-0 max-w-[20ch] font-semibold"
              style={{ fontSize: 'clamp(26px,3.4vw,40px)', lineHeight: 1.08, letterSpacing: '-.025em' }}
            >
              Cinco estados. Ni uno más.
            </h2>
            <p className="m-0 max-w-[56ch] text-pretty text-[15px] leading-[1.55]" style={{ color: INK_2 }}>
              Van de frío a cálido en el orden del proceso, así que la posición del color ya te dice cuánto
              avanzaste.
            </p>
          </div>
          <div className="grid grid-cols-5 gap-2.5">
            {APPLICATION_STATUSES.map((status) => (
              <div
                key={status}
                className="flex min-w-0 flex-col gap-[7px] border-t-[5px] pt-3.5"
                style={{ borderColor: STATUS_ACCENT_COLOR[status] }}
              >
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[.08em]">{STATUS_LABELS[status]}</span>
                <p className="m-0 text-pretty text-[13px] leading-[1.45]" style={{ color: INK_2 }}>
                  {STATE_DESCRIPTIONS[status]}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* PRECIO */}
        <section
          id="precio"
          className="grid grid-cols-1 items-center gap-[26px] border-t px-7 py-16 [grid-template-columns:repeat(auto-fit,minmax(290px,1fr))]"
          style={{ borderColor: LINE, background: '#fafafa' }}
        >
          <div className="flex flex-col gap-3">
            <Eyebrow onGray>Precio</Eyebrow>
            <h2
              className="m-0 max-w-[18ch] font-semibold"
              style={{ fontSize: 'clamp(26px,3.4vw,40px)', lineHeight: 1.08, letterSpacing: '-.025em' }}
            >
              Gratis mientras buscas.
            </h2>
            <p className="m-0 max-w-[44ch] text-pretty text-[15px] leading-[1.55]" style={{ color: INK_2 }}>
              Buscar empleo ya cuesta suficiente. JobTrackr no cobra por guardar tus propias postulaciones.
            </p>
          </div>
          <div className="flex flex-col gap-[18px] border bg-white p-[26px]" style={{ borderColor: INK }}>
            <div className="flex items-baseline gap-2.5">
              <span className="font-mono text-[44px] font-semibold leading-none tracking-[-.03em]">$0</span>
              <span className="font-mono text-[12px] font-medium uppercase leading-none tracking-[.08em]" style={{ color: MUTED }}>
                para siempre
              </span>
            </div>
            <div className="flex flex-col gap-2.5">
              {[
                'Postulaciones ilimitadas',
                'Tablero, notas y links',
                'Escritorio y móvil',
                'Exporta tus datos cuando quieras',
              ].map((item, i) => (
                <span key={item} className="flex items-baseline gap-2.5">
                  <span className="font-mono text-[11px]" style={{ color: MUTED }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[14px] leading-[1.45]" style={{ color: INK_2 }}>
                    {item}
                  </span>
                </span>
              ))}
            </div>
            <Link
              href="/register"
              className="py-3.5 text-center text-[14px] font-semibold text-white transition-colors hover:bg-[#374151]"
              style={{ background: INK }}
            >
              Crear mi tablero
            </Link>
            <span className="text-center text-[12px]" style={{ color: INK_3 }}>
              Sin tarjeta de crédito.
            </span>
          </div>
        </section>

        {/* PREGUNTAS */}
        <section className="flex flex-col gap-7 border-t px-7 py-16" style={{ borderColor: LINE }}>
          <div className="flex flex-col gap-2.5">
            <Eyebrow>Preguntas</Eyebrow>
            <h2
              className="m-0 max-w-[22ch] font-semibold"
              style={{ fontSize: 'clamp(26px,3.4vw,40px)', lineHeight: 1.08, letterSpacing: '-.025em' }}
            >
              Lo que suelen preguntar.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-px border [grid-template-columns:repeat(auto-fit,minmax(290px,1fr))]" style={{ background: LINE, borderColor: LINE }}>
            {FAQ.map(({ q, a }) => (
              <div key={q} className="flex flex-col gap-2 bg-white p-5">
                <span className="text-[15px] font-semibold leading-[1.3]">{q}</span>
                <p className="m-0 text-pretty text-[14px] leading-[1.55]" style={{ color: INK_2 }}>
                  {a}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CIERRE */}
        <section
          className="flex flex-col items-center gap-[22px] border-t px-7 py-[72px] text-center"
          style={{ borderColor: LINE, background: INK }}
        >
          <h2
            className="m-0 max-w-[20ch] text-balance font-semibold text-white"
            style={{ fontSize: 'clamp(28px,4vw,46px)', lineHeight: 1.06, letterSpacing: '-.03em' }}
          >
            Empieza con la vacante que tienes abierta ahora mismo.
          </h2>
          <p className="m-0 max-w-[46ch] text-pretty text-[16px] leading-[1.55]" style={{ color: LINE }}>
            Toma treinta segundos y es lo único que necesitas para dejar de reconstruir tu búsqueda de memoria.
          </p>
          <span className="flex flex-wrap justify-center gap-2.5">
            <Link
              href="/register"
              className="bg-white px-6 py-[15px] text-[14px] font-semibold text-[#111827] transition-colors hover:bg-[#e5e7eb]"
            >
              Crear mi tablero
            </Link>
            <Link
              href="/login"
              className="border px-[23px] py-3.5 text-[14px] font-semibold text-white transition-colors hover:border-white"
              style={{ borderColor: MUTED }}
            >
              Entrar
            </Link>
          </span>
        </section>

        {/* PIE */}
        <footer className="flex flex-wrap items-center justify-between gap-4 px-7 py-[26px]">
          <span className="flex items-center gap-2.5">
            <BrandMark size={20} />
            <span className="text-[13px] font-medium" style={{ color: INK_3 }}>
              JobTrackr · 2026
            </span>
          </span>
          <span className="flex flex-wrap gap-[18px]">
            {['Privacidad', 'Términos', 'Contacto'].map((label) => (
              <a
                key={label}
                href="#"
                className="text-[13px] font-medium no-underline transition-colors hover:text-[#111827]"
                style={{ color: INK_3 }}
              >
                {label}
              </a>
            ))}
          </span>
        </footer>
      </div>
    </main>
  );
}
