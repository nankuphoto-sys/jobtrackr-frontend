'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  HeaderPanel,
  SkipToContent,
  Button,
} from '@carbon/react';
import { Add, Logout, UserAvatar } from '@carbon/icons-react';
import { Logo } from '@/components/Logo';
import { StatusStrip } from '@/components/StatusStrip';
import { clearToken, getUserEmail } from '@/lib/auth';
import { JobApplication } from '@/lib/types';
import { useStoredValue } from '@/lib/useStoredValue';

export const MAIN_CONTENT_ID = 'main-content';
const PANEL_ID = 'jt-account-panel';

/**
 * Header de la app logueada, compartido por /applications y /account.
 *
 * Prioridad: logo → "Nueva postulación" (acción principal, siempre visible en
 * desktop; en mobile vive en la barra fija de abajo del tablero) → avatar, que
 * abre un panel con el email, "Mi cuenta" y "Cerrar sesión". Cerrar sesión no
 * va como ícono suelto: se usa poco y un toque accidental te saca de la app.
 *
 * Al pie lleva la franja de estados (StatusStrip): identidad de la landing
 * convertida en dato. Recibe las postulaciones que la página ya cargó, así
 * que no hace otra petición, y en el tablero se actualiza en vivo al arrastrar.
 *
 * Es position:fixed (48px) — la página que lo usa compensa con pt-12.
 */
export function AppHeader({
  current,
  applications,
  onCreate,
}: {
  current: 'board' | 'account';
  applications: JobApplication[];
  /** Sin onCreate (p. ej. desde /account) el botón lleva al tablero con el modal abierto. */
  onCreate?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const email = useStoredValue(getUserEmail, null);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // HeaderPanel de Carbon solo cierra por click afuera si su contenido es un
  // Switcher, así que el click afuera y Escape se manejan acá.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !avatarRef.current?.contains(target)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        avatarRef.current?.focus();
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function handleCreate() {
    if (onCreate) onCreate();
    else router.push('/applications?nueva=1');
  }

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  return (
    <Header aria-label="JobTrackr" className="jt-app-header">
      <SkipToContent href={`#${MAIN_CONTENT_ID}`}>Saltar al contenido</SkipToContent>
      {/* Contenido alineado con la columna del tablero (1180px), no de borde a borde. */}
      <div className="mx-auto flex h-full w-full max-w-[1180px] items-center">
        <HeaderName href="/applications" prefix="" aria-current={current === 'board' ? 'page' : undefined}>
          <span className="flex items-center gap-2">
            <Logo size={24} />
            JobTrackr
          </span>
        </HeaderName>
        {/* Separador que empuja todo a la derecha. No va como ml-auto en el botón:
            en mobile el botón está oculto (display:none) y su margen no empujaría nada. */}
        <div className="flex-1" aria-hidden="true" />
        <div className="hidden items-center pr-3 sm:flex">
          <Button size="sm" renderIcon={Add} onClick={handleCreate} className="jt-btn-ink">
            Nueva postulación
          </Button>
        </div>
        <HeaderGlobalBar className="!flex-none">
          <HeaderGlobalAction
            ref={avatarRef}
            aria-label="Mi cuenta"
            aria-expanded={open}
            aria-controls={PANEL_ID}
            isActive={open || current === 'account'}
            tooltipAlignment="end"
            onClick={() => setOpen((o) => !o)}
          >
            <UserAvatar size={20} className="jt-icon jt-icon-avatar" />
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </div>
      <StatusStrip applications={applications} />
      <HeaderPanel ref={panelRef} expanded={open} onHeaderPanelFocus={() => setOpen(false)} className="jt-account-panel">
        {/* Cerrado, Carbon solo pone el panel en ancho 0: si el contenido siguiera
            montado, sus links serían alcanzables con Tab sin verse. */}
        {open && (
          <div id={PANEL_ID} className="flex flex-col py-2">
            {email && (
              <p
                className="truncate border-b px-4 pb-3 pt-2 text-[13px]"
                style={{ color: 'var(--cds-text-secondary)', borderColor: 'var(--cds-border-subtle-01)' }}
                title={email}
              >
                {email}
              </p>
            )}
            <Link
              href="/account"
              aria-current={current === 'account' ? 'page' : undefined}
              onClick={() => setOpen(false)}
              className="jt-panel-item"
            >
              <UserAvatar size={16} />
              Mi cuenta
            </Link>
            <button type="button" onClick={handleLogout} className="jt-panel-item">
              <Logout size={16} className="jt-icon jt-icon-logout" />
              Cerrar sesión
            </button>
          </div>
        )}
      </HeaderPanel>
    </Header>
  );
}
