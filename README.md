# JobTrackr — Frontend

Next.js 14 (App Router) + TypeScript + Tailwind CSS para JobTrackr. Plan completo del proyecto: doc `plan-proyecto-portafolio-jobtrackr.md` en el proyecto "programacion".

## Setup

1. `npm install`
2. Copia `.env.example` a `.env.local` y ajusta `NEXT_PUBLIC_API_URL` si el backend corre en otro puerto.
3. `npm run dev` — abre `http://localhost:3000`.

## Estado

**Fase 0 (setup) completada:** Next.js + TypeScript + Tailwind configurados, página de inicio placeholder.

**Fase 2 completada:** cliente API centralizado (`lib/api.ts`) con manejo de JWT vía `localStorage`, páginas de registro/login, página protegida `/applications` (lista, cambia estado, borra) y `/applications/new` (crear). Next.js actualizado a 16.3.5 por vulnerabilidad de seguridad.
