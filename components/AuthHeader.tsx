import Link from 'next/link';
import { ArrowLeft } from '@carbon/icons-react';
import { Logo } from '@/components/Logo';

/**
 * Header de /login y /register. Mínimo a propósito: en estas páginas lo único
 * que importa es el formulario, así que solo da identidad (logo) y una salida
 * explícita a la landing. El cambio login ↔ registro ya está al pie de la tarjeta.
 * No es sticky: la página es corta y no hay scroll.
 */
export function AuthHeader() {
  return (
    <header
      className="flex h-14 items-center justify-between border-b px-4 sm:px-6"
      style={{ borderColor: 'var(--cds-border-subtle-01)', background: 'var(--cds-layer)' }}
    >
      <Link href="/" className="flex items-center gap-2.5 text-[color:var(--cds-text-primary)] no-underline">
        <Logo size={28} />
        <span className="text-[15px] font-semibold leading-none tracking-[-.01em]">JobTrackr</span>
      </Link>
      <Link
        href="/"
        className="flex items-center gap-1.5 py-2.5 text-[13px] font-medium text-[color:var(--cds-text-secondary)] no-underline transition-colors hover:text-[color:var(--cds-text-primary)]"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Volver al inicio
      </Link>
    </header>
  );
}
