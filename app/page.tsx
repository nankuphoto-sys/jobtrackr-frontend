import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-page p-4 sm:p-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <span className="grid h-[26px] w-[26px] place-items-center bg-ink font-mono text-[13px] font-semibold text-white">
          J
        </span>
        <h1 className="text-[28px] font-semibold tracking-[-.02em] text-ink">JobTrackr</h1>
        <p className="text-[14px] leading-[1.5] text-muted">
          Organiza y sigue tus postulaciones de empleo en un solo tablero.
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="bg-ink px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-ink-2"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="border border-line-strong px-4 py-2.5 text-[13px] font-semibold text-ink-2 transition-colors hover:border-ink"
          >
            Crear cuenta
          </Link>
        </div>
      </div>
    </main>
  );
}
