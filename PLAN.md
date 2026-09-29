# JobTrackr — Plan del proyecto

Proyecto de portafolio: cubre el stack que piden hoy las vacantes junior (React/Next.js, TypeScript, Node.js, REST APIs, Git, diseño responsive, Figma/Tailwind). Es un tablero Kanban para seguimiento de postulaciones de empleo (empresa, cargo, estado, fecha, link, notas), con dos repos separados:

- **jobtrackr-backend**: Node.js + Express + TypeScript + Prisma + PostgreSQL (Neon). API REST propia (no Next API routes, para que quede como habilidad separada). Auth con JWT + bcrypt hecho a mano.
- **jobtrackr-frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS. Mobile-first, responsive real.

Enfoque de aprendizaje: Jonta está aprendiendo a programar mientras construye esto — cada fase se explica (conceptos, trade-offs), no solo se ejecuta.

## Roadmap

1. **Fase 0 — Setup.** ✅ Completada. Los dos repos creados, scaffold inicial, subidos a GitHub (`nankuphoto-sys/jobtrackr-backend`, `nankuphoto-sys/jobtrackr-frontend`), backend conectado a Neon con tablas `User` y `JobApplication` migradas.

2. **Fase 1 — Backend REST API.** ✅ Completada. Rutas de auth (`/auth/register`, `/auth/login` con JWT+bcrypt) y CRUD completo de `/applications`, protegido con Authorization Bearer.

3. **Fase 2 — Frontend Next.js.** ✅ Completada. Cliente fetch centralizado con el header Authorization; páginas de registro y login que guardan el JWT; página protegida que lista las postulaciones del usuario; formularios para crear/editar/borrar postulaciones; todo con Tailwind mobile-first. Pulido después: auto-logout en 401, skeletons, confirmación de contraseña, tests (Vitest + Playwright) y CI en GitHub Actions en ambos repos.

4. **Fase 3 — Feature Kanban + dashboard.** ✅ Completada. `/applications` es un tablero con columnas por estado (Por aplicar → Aplicado → Entrevista → Oferta → Rechazado):
   - Drag & drop entre columnas con `@dnd-kit/core` (elegido sobre react-beautiful-dnd, que ya no se mantiene; da soporte de teclado accesible gratis vía su `KeyboardSensor`) que actualiza el estado vía `PUT /applications/:id`, optimista con rollback si falla.
   - Dashboard arriba del tablero: conteo total y por estado, "postulaciones esta semana", y "tasa de respuesta" (% de las ya aplicadas que avanzó a Entrevista u Oferta).
   - Responsive: columnas de ancho fijo en una fila con scroll horizontal + `snap`, así en mobile se sienten swipeables sin código extra para ese caso.
   - Cobertura e2e: agrupación por columna, drag-and-drop real (mouse events, no HTML5 DnD nativo porque dnd-kit usa Pointer Events), y métricas.

5. **Fase 4 — Pulido.** ✅ Completada.
   - Manejo de errores: se separó el error de carga inicial (bloqueaba y ocultaba todo el tablero — bug real) del error de una acción puntual (cambiar estado/borrar), que ahora se muestra como banner cerrable sin tapar el tablero. La carga inicial fallida ahora tiene botón "Reintentar".
   - Accesibilidad: el `KeyboardSensor` de dnd-kit ya daba foco y anuncios de fábrica, pero el salto por defecto era de 25px por flecha (~12 pulsaciones para cruzar una columna de 288px) — se reemplazó por un `coordinateGetter` a medida que salta directo a la columna vecina. Los anuncios y las instrucciones para lectores de pantalla, en inglés por defecto, se tradujeron y ahora mencionan la empresa real en vez de un id. Contraste de color auditado con cálculo real de WCAG (no a ojo): dos textos (`gray-400`, `red-500`) no llegaban a AA y se ajustaron.
   - QA en mobile real: las 6 pantallas revisadas a 375px con Chrome real vía Playwright, sin errores de consola ni de layout.
   - Tests e2e nuevos para blindar estos fixes (no solo "se ve bien", sino que el mecanismo funciona): retry tras error de carga, banner de error no oculta el tablero, y drag por teclado con una sola flecha por columna.

6. **Fase 5 — Deploy + documentación.** ✅ Desplegado y documentado (falta solo publicar el link en LinkedIn, que le corresponde a Jonta).
   - Backend en Render (Web Service, plan Free), conectado a GitHub para auto-deploy: https://jobtrackr-backend-ul8d.onrender.com
   - Frontend en Vercel (mismo auto-deploy vía GitHub): https://jobtrackr-frontend-two.vercel.app
   - Variables de entorno de producción separadas de desarrollo: `JWT_SECRET` nuevo (no se reutilizó el de dev), `FRONTEND_URL` restringe CORS del backend al dominio real de Vercel (antes aceptaba cualquier origen).
   - Se aprovechó para resolver una vulnerabilidad crítica real encontrada en el camino: `bcrypt@5.1.1` dependía de una versión vulnerable de `node-tar` (vía `node-pre-gyp`); `bcrypt@6.0.0` eliminó esa dependencia de raíz.
   - Flujo completo (registro → tablero → crear/editar/borrar) verificado con Playwright contra la app real en producción, no solo en local — incluyendo que el CORS restringido no rompió nada.
   - README de cada repo actualizado con el link a la demo, capturas de pantalla, y cómo está configurado el deploy.

7. **Pulido post-Fase 5 — Tests del backend.** ✅ Completado. El backend no tenía ningún test automatizado (solo verificación manual), asimétrico con la cobertura completa del frontend. 19 tests de integración (Vitest + Supertest) contra la app real y una base de datos real: CRUD completo, validaciones, y aislamiento entre usuarios (que un usuario no pueda leer/editar/borrar postulaciones ajenas). `src/app.ts` se separó de `src/index.ts` para poder testear la app sin levantar un puerto. Corren también en CI, antes del smoke-test de `/health`.

8. **Pulido post-Fase 5 — Monitoreo con Sentry.** ✅ Completado. Un proyecto por repo (`jobtrackr-frontend`, `jobtrackr-backend`) en la misma organización de Sentry. Setup manual (no el wizard) siguiendo la guía actual de cada SDK, que cambió bastante de lo esperado por versiones anteriores — en Next.js ahora es `instrumentation-client.ts` en vez del viejo `sentry.client.config.js`; en Express, un `instrument.ts` que se carga antes que cualquier otro módulo. Verificado con tráfico de red real (no solo que compile): se confirmó el evento llegando al ingest de Sentry en ambos casos, incluyendo contra las apps ya desplegadas en producción.

9. **Pulido post-Fase 5 — Tipos de React.** ✅ Completado. `@types/react` había quedado en v18 desde antes de migrar a React 19 (Fase 2), y `@types/react-dom` nunca se instaló. No rompía nada, pero podía dar tipos sutilmente incorrectos. Corregido.

10. **Pulido post-Fase 5 — Rediseño de headers.** ✅ Completado.
    - App logueada: el header estaba copiado en `/applications` y `/account` y ya se había desincronizado; ahora es un solo `components/AppHeader.tsx`. Prioridad: logo → "Nueva postulación" (acción principal, también desde `/account` vía `/applications?nueva=1`) → avatar. "Cerrar sesión" dejó de ser un ícono suelto (se usa poco y un toque accidental te saca de la app): vive en un panel del avatar junto al email y "Mi cuenta", que se cierra con click afuera o Escape (devolviendo el foco). Header fijo siempre visible — en una herramienta la acción principal no se esconde al hacer scroll. Skip link "Saltar al contenido" y `aria-current` en la página actual. Detalle de Carbon: el `HeaderPanel` cerrado solo queda en ancho 0, así que su contenido se monta solo cuando está abierto (si no, era alcanzable con Tab sin verse).
    - Landing: nav sticky con sombra solo tras hacer scroll; en mobile se ocultan los links a secciones para que entre en una fila (Entrar / Crear cuenta); `scroll-mt-20` en las secciones para que el título no quede tapado por el header; `scroll-smooth` solo con `motion-safe`.
    - Nuevo e2e `e2e/header.spec.ts` (panel, Escape, logout, crear desde /account).

11. **Pulido post-Fase 5 — Lint y tipos generados.** ✅ Completado.
    - `npm run lint` nunca funcionó: ESLint no estaba instalado y Next 16 además quitó `next lint`. Ahora ESLint 9 + `eslint-config-next` con flat config (`eslint.config.mjs`), y corre en CI. El primer lint encontró 3 errores `react-hooks/set-state-in-effect` (leer localStorage en un `useEffect` y copiarlo a un `useState`); se resolvieron con `lib/useStoredValue.ts`, basado en `useSyncExternalStore`, que es cómo React recomienda leer fuentes externas sin hydration mismatch.
    - `next-env.d.ts` salió de git: `next dev` y `next build` lo reescriben con rutas distintas y siempre aparecía modificado. Se regenera con `npm run typecheck` (`next typegen && tsc --noEmit`), que es lo que corre CI.

## Pendiente (no hecho todavía)

- **15 usuarios de test que siguen en producción** (`@jobtrackr.dev`). No entran con ninguna contraseña de test conocida, así que no se pudieron borrar por la API. Son inofensivos; si se quieren quitar, hay que hacerlo desde el SQL Editor de Neon (branch `production`) con `DELETE FROM "User" WHERE email LIKE '%@jobtrackr.dev'`, que borra en cascada sus postulaciones.

## Resuelto

- **Usuarios de test borrados de producción** (2026-09-29, con OK de Jonta): 127 de 142, vía la API de producción (`POST /auth/login` + `DELETE /auth/me`, que borra en cascada), filtrando solo `@jobtrackr.dev`. Sin conexión directa a la base de producción. Verificado: los 127 dan 401 al intentar loguearse.

- **Contraseña de `neondb_owner` rotada** (2026-09-29) en los branches `production` y `dev`, porque la connection string de `dev` se pegó en el chat (y un branch nace con las credenciales de su padre). `DATABASE_URL` actualizado en Render y en el `.env` local. El primer deploy falló con `Validation Error Count: 1` de Prisma (el valor en Render no era la URL completa) y producción quedó ~1 h respondiendo 502 en todo lo que toca la base; se corrigió pegando la connection string entera. Lección: en Render el valor va sin comillas y es la URL completa, no solo la contraseña. Verificado: producción responde 401 al login de un usuario inexistente, el local conecta a `dev`, y un usuario creado en `dev` no puede loguearse en producción.
- **Base de desarrollo separada de producción** (2026-09-29). Hasta el 2026-09-28 el `.env` local del backend apuntaba a la misma base Neon que Render: todo lo local (e2e, tests del backend, `npm run dev`) escribía en producción. Ahora el `.env` local apunta al branch `dev` (creado desde `production` con datos y esquema, sin auto-borrado); Render sigue en `production`. Comprobado: un usuario creado en `dev` no puede loguearse en la API de producción (HTTP 401). Los e2e además limpian lo que crean (`e2e/global-teardown.ts`).

- **Dominio propio**: Jonta ya tiene un dominio comprado (lo usa para otro proyecto, "RIME") y preguntó si se puede reusar para JobTrackr — sí, vía subdominio (ej. `jobtrackr.sudominio.com` para el frontend, sin tocar lo que ya tiene en la raíz). Falta que confirme el nombre exacto del dominio para configurar los registros DNS en Vercel/Render.
- Publicar el link en LinkedIn/GitHub — le corresponde a Jonta.

## Notas de contexto

- Jonta también está en búsqueda activa de empleo remoto (ver tarea de LinkedIn) — este proyecto es parte de su portafolio para esas aplicaciones.
- Decisiones ya tomadas: JWT guardado en localStorage por simplicidad (se explicó el trade-off vs. cookies httpOnly, no se implementó httpOnly por ahora). Next.js actualizado a la última versión por una vulnerabilidad conocida en 14.2.5.
