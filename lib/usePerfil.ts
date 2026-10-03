'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';
import { Perfil } from './encaje';

/**
 * Perfil para el puntaje de encaje (GET /ai/perfil). null si no hay
 * profile.json (producción) o si la llamada falla: el puntaje simplemente no
 * aparece, nada más se rompe.
 */
export function usePerfil(): Perfil | null {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  useEffect(() => {
    let vivo = true;
    api
      .get<{ perfil: Perfil | null }>('/ai/perfil')
      .then((r) => vivo && setPerfil(r.perfil))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);
  return perfil;
}

/** El tablero lo provee una vez y cada tarjeta lo lee, sin pasarlo por props. */
export const PerfilContext = createContext<Perfil | null>(null);
export const usePerfilDelTablero = () => useContext(PerfilContext);
