# Revisión de seguimiento con IA: diseño

Diseño de la Fase 7 (ver `PLAN.md`). Todavía no hay código.

La revisión mira las postulaciones del usuario (y, si quiere, un correo que pegue) y le **propone** la siguiente acción para cada una: hacer seguimiento, cambiar de estado o cerrarla. **Nunca escribe en la base**: las propuestas se aplican con los botones del tablero, que llaman a rutas que ya existen.

## Por qué no es un agente del Agent SDK

La primera versión de este documento usaba el Claude Agent SDK con herramientas de escritura y confirmación vía `canUseTool`. Se descartó al decidir dónde correría el agente:

- **`canUseTool` deja un proceso en pausa hasta que el usuario responde.** En una app web el usuario está en el navegador y el agente en el servidor, así que habría que mantener ese proceso vivo entre peticiones HTTP. Render (plan gratuito) se duerme, tiene 512 MB de RAM y pierde lo pendiente al reiniciar.
- **El Agent SDK arranca Claude Code como un proceso aparte, con herramientas integradas que aquí se desactivaban todas** (`tools: []`). Lo que más aporta el SDK no se usaba.
- **La tarea cabe en una llamada.** Los datos ya están en la base y el correo lo pega el usuario. No hace falta que el modelo explore ni encadene pasos.

El diseño actual cumple todos los límites de `PLAN.md`, y varios pasan de "el código lo impide" a "no existe la posibilidad": el modelo no tiene ninguna herramienta, así que no puede borrar, tocar `/auth/*`, editar campos ni enviar mensajes.

## Dónde corre

**Solo en local**, igual que el extractor de ofertas:

- Ruta nueva en el router `/ai` del backend: `POST /ai/revisar`.
- Se activa con `AI_REVISION_ENABLED=true` y `ANTHROPIC_API_KEY` en el `.env` del backend local.
- `GET /ai/status` informa si está disponible. En producción (Render) está apagado: la ruta responde 503 y el frontend muestra el botón con un aviso.
- Motivo: cada revisión se cobra a la clave de la API, y en la demo pública cualquiera puede registrarse.

## Flujo

1. El usuario pulsa **Revisar mis postulaciones** y, si quiere, pega un correo.
2. El backend lee **sus** postulaciones (con la sesión normal, filtradas por `userId`) y calcula los avisos.
3. Una llamada a la API de Claude con **salida estructurada** (`output_config.format`) devuelve las propuestas en JSON con un esquema fijo.
4. El backend **valida cada propuesta por código** y descarta las que no pasen (ver abajo).
5. El frontend muestra una tarjeta por propuesta, con **[Aplicar]** e **[Ignorar]**. "Aplicar" usa `PUT /applications/:id` (solo `status`) o `POST /applications/:id/follow-up`, con la sesión del usuario.

`POST /ai/revisar` no guarda nada, igual que `POST /ai/extract-job`.

## Entrada al modelo

- La lista de postulaciones: `id`, empresa, cargo, estado, días en el estado, último seguimiento, fecha límite, notas y aviso de hoy.
- El texto pegado (opcional, con un tope de largo como `MAX_TEXTO`), **marcado como datos**: el prompt deja claro que es contenido a analizar, no instrucciones. Es la protección contra prompt injection.

## Salida (esquema fijo)

```jsonc
{
  "propuestas": [
    {
      "id": "cmg...",                       // debe ser una postulación del usuario
      "accion": "cambiar_estado",           // "cambiar_estado" | "seguimiento" | "cerrar"
      "estado_nuevo": "ENTREVISTA",         // solo con cambiar_estado; "cerrar" = RECHAZADO
      "evidencia": "Nos gustaría agendar una entrevista técnica el jueves", // o null
      "motivo": "El correo invita a una entrevista.",
      "borrador": null                      // texto de correo de seguimiento, si aplica
    }
  ],
  "sin_propuesta": [
    { "id": "cmh...", "razon": "El correo dice 'seguimos evaluando perfiles': es ambiguo." }
  ]
}
```

`seguimiento` significa "te sugiero escribir; aquí va un borrador". **No registra nada.** El usuario marca "Hice seguimiento" solo después de enviar el correo de verdad, con el botón que ya existe en el modal.

## Validación por código (antes de mostrar nada)

Es el mismo criterio de `extraerOferta`, que descarta los datos que no están en el texto:

| Regla | Si no se cumple |
|---|---|
| El `id` es una postulación del usuario | Se descarta la propuesta |
| `estado_nuevo` es un estado válido y distinto del actual | Se descarta |
| `cambiar_estado` basado en un correo trae `evidencia` | Se descarta |
| La `evidencia` aparece **literalmente** en el texto pegado (normalizando espacios y mayúsculas) | Se descarta: es una cita inventada |
| Sin texto pegado, `cambiar_estado` solo puede ser `cerrar` por fecha límite vencida | Se descarta: sin correo no hay evidencia de una respuesta de la empresa |
| Como mucho una propuesta por postulación | Se queda la primera |

La respuesta incluye cuántas se descartaron y por qué, igual que `descartados` en el extractor, para medir la calidad.

## Reporte semanal

Decidido el 2026-10-05: el reporte es una **vista en la app**, no un envío programado. Es una sección **"Esta semana"** en la pestaña Reportes de `/account`, junto a "Postulaciones por semana", el embudo y el tiempo por estado.

**Por qué una vista y no un correo o un archivo programado:** la revisión con IA corre solo en local, así que un envío automático necesitaría el PC encendido y el backend corriendo a una hora fija. Una vista se genera cuando la abres y no depende de nada de eso.

**Contenido**, en dos partes:

| Parte | Qué muestra | De dónde sale | Dónde funciona |
|---|---|---|---|
| Resumen (sin IA) | Movimientos de los últimos 7 días (cambios de estado y seguimientos), postulaciones nuevas, pendientes de hoy por tipo de aviso y fechas límite de los próximos 7 días | `GET /applications` (con `aviso`) y `GET /applications/status-history`, ya existentes | En local y en producción |
| Propuestas (con IA) | Lo mismo que devuelve `POST /ai/revisar` sobre las pendientes, con [Aplicar] / [Ignorar] | `POST /ai/revisar` | Solo en local. En producción la sección se muestra apagada, igual que el extractor |

- El resumen se calcula en el frontend con funciones puras en `lib/reports.ts`, como el resto de la pestaña, con sus tests.
- **"Semana" son los últimos 7 días**, no la semana de calendario. Así el reporte del lunes no sale casi vacío.
- **Seguimientos de la semana (resuelto):** como `lastFollowUpAt` guarda solo el último, el resumen cuenta *postulaciones con seguimiento en la semana* (empresas contactadas), no correos enviados. Es exacto con los datos actuales y no necesita migración. Si algún día hace falta el conteo de correos, habría que agregar una tabla de historial de seguimientos.
- **El resumen sin IA ya está implementado** (sección "Esta semana" en Reportes, `computeWeeklySummary` en `lib/reports.ts`). Falta la parte con IA.

## Decisiones abiertas

- ~~**Dónde viven las reglas de los avisos.**~~ **Resuelto:** se movieron al backend (`src/lib/recordatorios.ts`), y cada postulación sale de la API con su `aviso` calculado en la zona horaria del usuario (header `X-Timezone`). `POST /ai/revisar` usará la misma función.
- **Modelo y costo por revisión.** Medir con postulaciones reales antes de fijarlo.
- **Evaluación.** Igual que `npm run eval:extractor`: un conjunto de correos reales (anonimizados) con la propuesta esperada, para medir aciertos y citas inventadas antes de confiar en la revisión.
