'use client';

import Link from 'next/link';
import { Button } from '@carbon/react';

export default function Home() {
  return (
    <main
      className="flex min-h-screen items-center justify-center p-4 sm:p-6"
      style={{ background: 'var(--cds-background)' }}
    >
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <span
          className="grid h-[26px] w-[26px] place-items-center font-mono text-[13px] font-semibold"
          style={{ background: 'var(--cds-text-primary)', color: 'var(--cds-background)' }}
        >
          J
        </span>
        <h1 className="text-[28px] font-semibold tracking-[-.02em] text-[color:var(--cds-text-primary)]">
          JobTrackr
        </h1>
        <p className="text-[14px] leading-[1.5] text-[color:var(--cds-text-secondary)]">
          Organiza y sigue tus postulaciones de empleo en un solo tablero.
        </p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Button as={Link} href="/login">
            Iniciar sesión
          </Button>
          <Button as={Link} href="/register" kind="secondary">
            Crear cuenta
          </Button>
        </div>
      </div>
    </main>
  );
}
