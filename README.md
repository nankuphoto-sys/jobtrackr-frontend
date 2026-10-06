# JobTrackr — Frontend

Next.js 16 (App Router) + TypeScript + Tailwind CSS para JobTrackr. Plan completo del proyecto: [`PLAN.md`](./PLAN.md).

**Demo en vivo:** https://jobtrackr-frontend-two.vercel.app
(backend en Render, free tier — la primera visita después de un rato inactivo puede tardar ~30-50s en despertar)

![Tablero Kanban de JobTrackr](docs/screenshots/readme-kanban.png)

<details>
<summary>Más capturas (inicio, mobile)</summary>

![Página de inicio](docs/screenshots/readme-home.png)
![Vista mobile del tablero](docs/screenshots/readme-mobile.png)

</details>

## Setup

1. `npm install`
2. Copia `.env.example` a `.env.local` y ajusta `NEXT_PUBLIC_API_URL` si el backend corre en otro puerto.
3. `npm run dev` — abre `http://localhost:3000`.

## Pegar oferta (extractor con IA local)

El botón **Pegar oferta** del tablero abre un modal: pegas el texto de una oferta, **Extraer con IA local** la manda al backend, que la procesa con un modelo local ([Ollama](https://ollama.com)), y vuelve un formulario prellenado y editable (con los chips del stack). **Crear tarjeta** usa la misma creación de siempre, en "Por aplicar". Nada se guarda sin que lo revises.

Solo funciona con el **backend corriendo en tu PC** y Ollama abierto; la instalación está en el [README del backend](https://github.com/nankuphoto-sys/jobtrackr-backend#extractor-de-ofertas-con-ia-local-opcional). En producción el extractor está apagado: el modal lo avisa y deja llenar la tarjeta a mano.

## Recordatorios de seguimiento

El tablero avisa en la tarjeta cuando una postulación lleva tiempo quieta: **"Sin respuesta"** después de 14 días en *Aplicado*, **"Sin novedades"** después de 7 días en *Entrevista* y **"Cierra en N días"** cuando a una oferta en *Por aplicar* le quedan 3 días o menos de fecha límite. El modal de la tarjeta trae dos acciones rápidas: **Hice seguimiento**, que reinicia el aviso sin cambiar el estado, y **Marcar rechazado**. La barra de métricas muestra cuántas están **Pendientes**. Las reglas y sus umbrales (`UMBRALES`) viven en el backend (`src/lib/recordatorios.ts`): cada postulación llega de la API con su `aviso` ya calculado, usando la zona horaria del navegador (header `X-Timezone`).

En **Mi cuenta → Reportes**, la sección **Esta semana** resume los últimos 7 días: postulaciones nuevas, cambios de estado, postulaciones con seguimiento, pendientes de hoy y fechas límite de los próximos 7 días. Funciona sin IA, también en la demo.

## Tests

- `npm test` — tests unitarios (Vitest) de `lib/` (cliente API, auth, reportes, encaje y recordatorios). No requieren nada corriendo.
- `npm run test:e2e` — tests end-to-end (Playwright) contra la app real: registro, login, CRUD de postulaciones, expiración de token. **Requiere el backend corriendo** (`jobtrackr-backend`, `npm run dev`, puerto 4000) — si no está disponible, falla con un mensaje claro en vez de errores crípticos. Usa el Chrome instalado en el sistema (`channel: 'chrome'`), no descarga su propio binario.

## Deploy

Desplegado en **Vercel** (`vercel deploy --prod`), conectado al repo de GitHub para auto-deploy en cada push a `main`. Variables de entorno en producción: `NEXT_PUBLIC_API_URL` (backend en Render) y `NEXT_PUBLIC_SENTRY_DSN` (monitoreo de errores).

## Estado

**Fase 0 (setup) completada:** Next.js + TypeScript + Tailwind configurados, página de inicio placeholder.

**Fase 2 completada:** cliente API centralizado (`lib/api.ts`) con manejo de JWT vía `localStorage` (incluye auto-logout si el token expira), páginas de registro/login (con confirmación de contraseña), página protegida `/applications` con `/applications/new` (crear) y `/applications/[id]/edit` (editar todos los campos). Next.js actualizado a 16.3.5 por vulnerabilidad de seguridad. Cobertura de tests: unitarios (Vitest) + e2e (Playwright) + CI en GitHub Actions.

**Fase 3 completada:** `/applications` es ahora un tablero Kanban (`@dnd-kit/core`) con una columna por estado, drag & drop que actualiza el estado vía `PUT /applications/:id`, barra de métricas (total, conteo por estado, postulaciones de la semana, tasa de respuesta) y columnas swipeables en mobile (scroll horizontal con snap).

**Fase 4 completada:** el drag & drop se puede operar 100% por teclado (Tab → Space → flechas → Space, con anuncios en español para lectores de pantalla); un error al cambiar de estado o borrar ya no oculta el tablero completo (bug real que se corrigió); carga inicial fallida tiene botón "Reintentar"; contraste de color auditado con WCAG real; QA mobile en las 6 pantallas.

**Fase 5 completada:** deploy real en Vercel (frontend) + Render (backend, free tier), variables de entorno de producción separadas de desarrollo (`JWT_SECRET` propio, `FRONTEND_URL` restringiendo CORS al dominio real en vez de aceptar cualquier origen), flujo completo (registro → tablero → CRUD) verificado contra la app en producción real, no solo en local.

**Pulido post-Fase 5:** tests de integración del backend (ver su README), `@types/react`/`@types/react-dom` alineados con React 19, y monitoreo de errores en producción con **Sentry** — verificado con tráfico de red real, no solo que compile.

**Fase 6 completada:** recordatorios de seguimiento en el tablero (ver arriba), con tests unitarios de las reglas y e2e del flujo completo.
