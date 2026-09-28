import { useSyncExternalStore } from 'react';

/**
 * localStorage es una "fuente externa" a React: se lee con useSyncExternalStore
 * en vez de copiarlo a un useState dentro de un useEffect (eso provoca un render
 * extra y la regla react-hooks/set-state-in-effect lo marca como error).
 *
 * En el servidor (y durante la hidratación) devuelve `serverValue`, así el HTML
 * coincide; después React re-renderiza solo con el valor real del navegador.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  // 'storage' solo avisa de cambios hechos en OTRAS pestañas.
  window.addEventListener('storage', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** Llamar después de escribir en localStorage para que los componentes de esta pestaña se enteren. */
export function notifyStoredValueChange() {
  listeners.forEach((l) => l());
}

/** `read` debe devolver un valor primitivo (string, boolean, null…): React compara snapshots con Object.is. */
export function useStoredValue<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(subscribe, read, () => serverValue);
}
