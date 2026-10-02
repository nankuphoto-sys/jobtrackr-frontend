# Agentes y subagentes de JobTrackr: implementación

Cómo está construido el agente de Claude Code que trabaja en este proyecto: qué archivo hace qué, cómo se conectan las piezas y cómo extenderlo sin romper nada.

Documentos relacionados:
- [`flujo-agente.md`](flujo-agente.md): el recorrido de una tarea paso a paso.
- [`evaluacion-agente.md`](evaluacion-agente.md): cómo se mide si el agente trabaja bien.

---

## 1. Mapa de archivos

```
jobtrackr-frontend/
├── CLAUDE.md                        Reglas del agente (se cargan en cada sesión)
├── AGENTS.md                        Reglas de Next.js 16, generadas por `next dev` (CLAUDE.md las importa)
├── .claude/
│   ├── settings.json                Permisos (allow / ask / deny) + hooks del repo
│   ├── agents/
│   │   ├── jobtrackr-diagnostico.md Subagente: encuentra la causa raíz (solo lee)
│   │   └── jobtrackr-verificador.md Subagente: aprueba o rechaza un cambio (solo lee)
│   ├── audit.mjs                    Hook de auditoría: escribe el registro
│   ├── guardas.mjs                  Hook que bloquea cualquier push forzado (revisa el comando completo)
│   ├── audit/AAAA-MM-DD.jsonl       El registro (no se versiona: .gitignore)
│   └── eval/
│       ├── metricas.mjs             Capa 1: reglas R1–R6 sobre el registro
│       ├── escenarios.mjs           Capa 2: batería de escenarios en entornos trampa
│       ├── recordatorios.mjs        Hooks que recuerdan correr la evaluación
│       ├── ignorar.json             Exclusiones explícitas para las métricas
│       └── .ultima-metricas         Fecha de la última corrida (no se versiona)
└── docs/
    ├── agentes.md                   Este documento
    ├── flujo-agente.md
    └── evaluacion-agente.md

Fuera del repo:
~/.claude/settings.json              Hooks globales: auditoría para sesiones abiertas en otra carpeta
~/.claude/projects/<proyecto>/memory/ Memoria del agente entre sesiones
```

---

## 2. Arquitectura

```
                     ┌──────────────────────────────┐
  Jonta ───pedido───▶│  AGENTE PRINCIPAL             │◀── CLAUDE.md + AGENTS.md (reglas)
                     │  Claude Code, modo auto        │◀── settings.json (permisos)
                     │  único que edita y hace commit │◀── memoria (entre sesiones)
                     └───┬──────────────┬────────────┘
             no sé la    │              │  cambio hecho,
             causa       ▼              ▼  antes del commit
        ┌─────────────────────┐  ┌─────────────────────┐
        │ jobtrackr-diagnostico│  │ jobtrackr-verificador│
        │ Sonnet · solo lectura│  │ Sonnet · solo lectura│
        │ ↩ causa + arreglo   │  │ ↩ APRUEBA / NO       │
        └─────────────────────┘  └─────────────────────┘

  Cada prompt, comando, edición, subagente y bloqueo ──▶ hooks ──▶ .claude/audit/*.jsonl
                                                                    │
                                     metricas.mjs (R1–R6) ◀─────────┘
```

**La idea central:** el que arregla no es el que diagnostica ni el que aprueba. Los dos subagentes **no pueden editar**: sus herramientas son solo `Read`, `Grep`, `Glob` y `Bash`. Así, el diagnóstico investiga sin riesgo de "arreglar de paso", y el verificador juzga el cambio sin haberlo escrito.

---

## 3. Los subagentes

Un subagente es un archivo Markdown en `.claude/agents/` con un encabezado (*frontmatter*) y un prompt de sistema:

```markdown
---
name: jobtrackr-verificador
description: Revisor independiente de JobTrackr. Úsalo de forma proactiva DESPUÉS de …
tools: Read, Grep, Glob, Bash
model: sonnet
---
Eres el verificador de JobTrackr. …
```

| Campo | Para qué sirve |
|---|---|
| `name` | Cómo se lo invoca (`subagent_type` en la herramienta Agent) |
| `description` | **Cuándo** usarlo. El agente principal la lee para decidir si delegar; por eso dice "úsalo de forma proactiva…" |
| `tools` | Lo que puede usar. Sin `Edit` ni `Write`, no puede modificar archivos |
| `model` | `sonnet`: más rápido y barato que el principal, y suficiente para leer y correr comandos |

Cada subagente arranca **sin el contexto de la conversación**: solo ve su prompt de sistema y lo que le pasa el principal. Por eso los prompts son autosuficientes (alcance, reglas, trampas conocidas del proyecto, formato de respuesta).

### jobtrackr-diagnostico

- **Cuándo:** hay un bug, un test que falla o un build roto, y no se sabe dónde está la causa. Si el agente la encuentra leyendo el código, no hace falta.
- **Método:** reproducir → acotar la capa (tipos, render, `lib/api.ts`, ruta, Prisma) → seguir el dato de punta a punta → confirmar con evidencia mínima → buscar el mismo patrón en otros archivos.
- **Devuelve:** veredicto, evidencia (separando lo verificado de lo supuesto), arreglo propuesto con el porqué, cómo verificarlo, y riesgos.

### jobtrackr-verificador

- **Cuándo:** después de cualquier cambio de código y **antes** del commit.
- **Nivel A**, siempre: `typecheck`, lint, unitarios y build. No tocan datos.
- **Nivel B**, si el cambio toca la API, la autenticación o los flujos: tests del backend y e2e. Escriben en el branch `dev` de Neon, nunca en producción. Los e2e limpian sus usuarios e imprimen `[e2e] limpieza: N/M`, y el verificador copia esa línea tal cual.
- **Devuelve:** `APRUEBA`, `NO APRUEBA` o `APRUEBA PARCIAL`, con una tabla de lo ejecutado, los fallos, lo no verificado y los efectos colaterales.

### Alcance: siempre relativo

Los dos trabajan en **el directorio donde se los invoca** (lo confirman con `git rev-parse --show-toplevel`), y el backend es `../jobtrackr-backend`. Antes tenían escrita la ruta absoluta del repo real, y en un clon o worktree verificaban **otro código**. Lo encontró la batería de escenarios el 30 de septiembre. **No vuelvas a poner rutas absolutas en un subagente.**

---

## 4. Reglas (CLAUDE.md)

`CLAUDE.md` se carga en cada sesión abierta desde el repo. Contiene:

| Sección | Qué exige |
|---|---|
| `@AGENTS.md` | Importa las reglas de Next.js 16 (leer la doc de `node_modules/next/dist/docs/` antes de escribir código) |
| Registro de auditoría | Escribir un registro `decision` después de cada cambio no trivial, con el `ref` del prompt donde Jonta aprobó |
| Subagentes | Cuándo usar cada uno. **Sin un APRUEBA no hay commit**, y un veredicto dudoso se resuelve volviendo a lanzar el verificador, no ignorándolo |
| Permisos | No rodear los bloqueos |
| Credenciales | No repetir secretos pegados en el chat y recomendar rotarlos |

**Una regla nueva se prueba antes del commit.** La batería de escenarios copia el CLAUDE.md de disco al entorno de prueba, así que puedes medir el efecto de una regla sin commitearla. El hook de recordatorios te lo avisa cuando editas este archivo.

---

## 5. Permisos (`.claude/settings.json` → `permissions`)

| Lista | Qué contiene | Efecto |
|---|---|---|
| `allow` | `git status/diff/log`, `tsc`, `npm test`, `npm run build` | Se ejecutan sin preguntar |
| `ask` | `git push`, migraciones de Prisma, `curl` que escribe | Piden confirmación a Jonta |
| `deny` | `git push --force/-f`, `git reset --hard`, `rm -rf`, leer `.env` | Bloqueados siempre |

**Las reglas de permisos comparan el comienzo del comando.** `Bash(git push --force:*)` bloquea `git push --force origin main`, pero no `git push origin main --force` ni `git push origin +main`. Para los push forzados, el bloqueo real lo hace el hook `guardas.mjs`, que revisa el comando completo (sección 6). Si agregas otra prohibición crítica, no confíes solo en un prefijo de `deny`: agrégala también a `guardas.mjs`, con sus pruebas.

Encima de esto, en **modo auto** un clasificador decide los casos que no están en las listas. Por ejemplo, bloqueó un merge sin revisión y la búsqueda de una contraseña en el registro.

**Leer `.env` está prohibido, y eso impide también editarlo.** Las herramientas de edición exigen leer el archivo primero. Por eso el agente no puede escribir una connection string en el `.env`: le dice a Jonta dónde va.

---

## 6. Hooks

Los hooks son comandos que Claude Code ejecuta solo, en cada evento. No dependen de que el modelo "se acuerde".

| Evento | Script | Qué hace |
|---|---|---|
| `UserPromptSubmit` | `audit.mjs hook` | Registra el prompt con un `ref` (`<sesión>#<n>`), que después cita la aprobación |
| `PreToolUse` (Bash) | `audit.mjs hook` | Si el comando es riesgoso, lo registra como `riesgo` con sus `motivos` |
| `PreToolUse` (Bash) | `guardas.mjs` | **Bloquea** cualquier push forzado: `--force` en cualquier posición, `-f` combinado, `--force-with-lease`, refspec con `+`, `git -C … push --force`. Probado con 13 formas que debe bloquear y 12 comandos normales que debe dejar pasar |
| `PostToolUse` (Bash, Edit, Write) | `audit.mjs hook` | Registra cada acción con su resultado |
| `PostToolUse` (Edit, Write) | `eval/recordatorios.mjs edicion` | Si se editó la configuración del agente, recuerda correr la batería (una vez por sesión) |
| `PostToolUseFailure` | `audit.mjs hook` | Registra acciones fallidas con el error |
| `SubagentStop` | `audit.mjs hook` | Registra el informe final de cada subagente |
| `PermissionDenied` | `audit.mjs hook` | Registra lo que el sistema de permisos bloqueó |
| `SessionStart` | `eval/recordatorios.mjs inicio` | Si las métricas tienen más de 7 días, recuerda correrlas |

### Cómo funciona `audit.mjs`

- **Nunca falla ni bloquea:** cualquier error se traga y sale con código 0, para que un fallo del registro no rompa la sesión.
- **Oculta secretos** (contraseñas en URLs, tokens, JWT) antes de escribir.
- **Recorta cada comando a 500 caracteres al guardarlo,** pero **clasifica el riesgo sobre el comando completo**. Antes clasificaba el texto recortado, y un `git push` al final de un commit largo quedaba invisible.
- **Motivos de riesgo:** `push`, `reset-hard`, `migracion`, `curl-escritura`, `produccion-escritura` (escrituras a Render o Vercel desde scripts) y `borrado-recursivo`.
- **Marca como `meta`** los comandos que fabrican eventos de prueba, para que no cuenten como trabajo real.
- **Modo `--global`:** se usa desde `~/.claude/settings.json` para auditar sesiones abiertas **fuera** del repo. Solo registra sesiones que tocan JobTrackr, y no duplica cuando la sesión se abre desde el repo.

### Tipos de entrada en el registro

```jsonc
{"type":"prompt",   "ref":"<sesión>#3", "texto":"…"}
{"type":"riesgo",   "motivos":["push"], "comando":"git push …", "ultimo_prompt":"<sesión>#3"}
{"type":"accion",   "herramienta":"Bash", "comando":"…", "motivos":["push"], "resultado":"ok"}
{"type":"accion",   "herramienta":"Edit", "archivo":"…", "resultado":"ok"}
{"type":"subagente","subagente":"jobtrackr-verificador", "mensaje_final":"**Veredicto:** APRUEBA …"}
{"type":"denegado", "herramienta":"Bash", "comando":"gh pr merge 1", "detalle":"…"}
{"type":"decision", "problema":"…", "causa_raiz":"…", "accion":"…", "por_que":"…",
 "alternativas_descartadas":[…], "verificacion":[…], "no_verificado":[…],
 "aprobacion":{"requerida":true,"ref":"<sesión>#3","texto":"…"}, "commit":"abc1234"}
```

Todas las entradas llevan `ts`, `session`, `actor` y `cwd`. Las de modo global llevan además `origen: "global"`.

---

## 7. Fuera del repo

| Pieza | Dónde | Para qué |
|---|---|---|
| Hooks globales | `~/.claude/settings.json` | Auditoría cuando la sesión se abre desde otra carpeta. **Ojo:** los permisos y CLAUDE.md del repo **no** se cargan en ese caso, así que conviene abrir las sesiones desde `jobtrackr-frontend` |
| Memoria | `~/.claude/projects/<proyecto>/memory/` | Lo que el agente recuerda entre sesiones: quién es Jonta, el plan, pendientes y recordatorios |
| Rutina en la nube | claude.ai/code/routines | Recordatorios programados por correo (por ejemplo, la segunda publicación en LinkedIn) |

---

## 8. Cómo extenderlo

### Agregar un subagente

1. Crea `.claude/agents/jobtrackr-<nombre>.md` con `name`, `description` (que diga **cuándo** usarlo), `tools` mínimas y `model`.
2. En el prompt incluye: una sola pregunta que responde, reglas duras, **alcance relativo** al directorio de trabajo, método, trampas conocidas y formato de respuesta fijo.
3. Si no debe editar, no le des `Edit` ni `Write`.
4. Menciónalo en la sección "Subagentes" de CLAUDE.md, con cuándo usarlo.
5. Agrega un escenario a `escenarios.mjs` que compruebe que se usa cuando corresponde, y corre la batería antes del commit.

### Agregar una regla a CLAUDE.md

1. Escríbela como conducta comprobable ("con NO APRUEBA no hay commit"), no como intención ("ser cuidadoso").
2. Si es de seguridad, agrega o ajusta un escenario que la pruebe.
3. Corre la batería con la regla en disco y revisa cada nota a mano.

### Agregar un hook

1. Escribe el script en `.claude/` o `.claude/eval/`. Que **nunca falle**: envuelve todo en `try` y sal con código 0.
2. Pruébalo pasándole eventos simulados por stdin, sin escribir en el registro real.
3. Agrégalo a `.claude/settings.json` **sin borrar** los hooks existentes, y valida el JSON.
4. Si tiene que funcionar también fuera del repo, agrégalo a `~/.claude/settings.json` con su modo global.

**En todos los casos:** verificador antes del commit, `decision` después del push, y `node .claude/eval/metricas.mjs` sin fallas nuevas.

---

## 9. Decisiones de diseño (y por qué)

| Decisión | Por qué |
|---|---|
| Subagentes de solo lectura | El que arregla no se aprueba a sí mismo |
| Sonnet para los subagentes | Leen y corren comandos; no hace falta el modelo más grande |
| El *qué* lo registran los hooks; el *porqué*, el agente | Los hooks no se olvidan; el razonamiento solo lo puede escribir el agente |
| Rutas relativas en los subagentes | Con rutas absolutas, en un clon o worktree verificaban otro código |
| Clasificar el riesgo sobre el comando completo | El registro recorta a 500 caracteres y se perdían push y borrados |
| Registrar los bloqueos de permisos | Para detectar si el agente intenta rodearlos (regla R6) |
| Guardas con patrón además de `deny` | `deny` compara prefijos; un hook ve el comando completo |
| Evaluar en sesiones nuevas y entornos trampa | Un agente que ya conoce las respuestas no se mide; y un fallo en un escenario de seguridad no debe hacer daño real |

---

## 10. Limitaciones conocidas

- **`guardas.mjs` solo cubre push forzados.** Otras acciones destructivas (`git reset --hard`, `rm -rf`) dependen todavía de los prefijos de `deny`, con el mismo hueco: un flag al final no coincide con el prefijo.
- **La guarda solo funciona en sesiones abiertas desde el repo:** no está en los hooks globales, para no imponer la regla a otros proyectos.
- **Los `ref` de aprobación se numeran por día:** en una sesión de varios días dos prompts pueden compartir `ref`.
- **Sesiones abiertas fuera del repo:** se auditan, pero sin las reglas ni los permisos del repo.
- **El agente no es determinista:** una batería aprobada no garantiza la siguiente corrida. Ver `evaluacion-agente.md`.
