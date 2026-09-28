# Flujo del agente de JobTrackr

Cómo el agente de Claude Code resuelve una tarea típica en este proyecto (por ejemplo, "el botón Reintentar no hace nada"), qué pieza de la configuración interviene en cada paso y dónde puede fallar.

Piezas involucradas:

| Pieza | Archivo | Qué hace |
|---|---|---|
| Reglas | `CLAUDE.md`, `AGENTS.md` | Qué subagente usar, cuándo pedir aprobación, cuándo registrar decisiones |
| Permisos | `.claude/settings.json` → `permissions` | `allow` tsc/test/build · `ask` push/migraciones/curl que escribe · `deny` force-push, reset --hard, rm -rf, leer `.env` |
| Hooks de auditoría | `.claude/settings.json` → `hooks` + `.claude/audit.mjs` | Registran solos el **qué** en `.claude/audit/AAAA-MM-DD.jsonl` |
| Hooks globales | `~/.claude/settings.json` → `audit.mjs hook --global` | Lo mismo cuando la sesión se abre fuera de este repo |
| Diagnóstico | `.claude/agents/jobtrackr-diagnostico.md` | Subagente de solo lectura: encuentra la causa raíz |
| Verificador | `.claude/agents/jobtrackr-verificador.md` | Subagente de solo lectura: aprueba o rechaza un cambio |

## El flujo

```
 ┌─────────────────────────────────────────────────────────────────────┐
 │ 0. ARRANQUE DE SESIÓN                                               │
 │    Desde este repo: CLAUDE.md + settings.json (permisos + hooks)    │
 │    Desde otra carpeta: solo los hooks globales (~/.claude)          │
 │    → sin los permisos ni las reglas de este repo                    │
 └───────────────────────────────┬─────────────────────────────────────┘
                                 ▼
 ┌─────────────────────────────────────────────────────────────────────┐
 │ 1. LLEGA EL PEDIDO                                                  │
 │    hook UserPromptSubmit → {type:prompt, ref:"<sesión>#n"}          │
 │    (ese ref es lo que después cuenta como "aprobación")             │
 └───────────────────────────────┬─────────────────────────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │ ¿Sé dónde está la causa?│
                    └───────┬────────┬────────┘
                         no │        │ sí
                            ▼        │
 ┌──────────────────────────────┐    │
 │ 2. SUBAGENTE diagnostico     │    │
 │  (SOLO LECTURA)              │    │
 │  reproduce → acota la capa → │    │
 │  sigue el dato UI→api→ruta→  │    │
 │  Prisma → confirma la causa  │    │
 │  ↩ Veredicto + Evidencia +   │    │
 │    Arreglo propuesto         │    │
 └──────────────┬───────────────┘    │
                ▼                    ▼
 ┌─────────────────────────────────────────────────────────────────────┐
 │ 3. EL AGENTE PRINCIPAL APLICA EL CAMBIO (Edit / Write)              │
 │    PostToolUse → registra cada edición y cada comando               │
 │    PreToolUse(Bash) → marca los comandos riesgosos                  │
 └───────────────────────────────┬─────────────────────────────────────┘
                                 ▼
 ┌─────────────────────────────────────────────────────────────────────┐
 │ 4. SUBAGENTE verificador (SOLO LECTURA; parte del git diff)         │
 │    Nivel A (siempre): typecheck · lint · vitest · build             │
 │    Nivel B (API/auth/flujos): tests del backend + e2e               │
 │      → escriben en la base a la que apunta el .env del backend      │
 │      → hoy esa base ES producción: el Nivel B se valida en CI       │
 │    SubagentStop → registra su informe                               │
 └──────────────┬────────────────────────────────────┬─────────────────┘
        NO APRUEBA                                APRUEBA
                ▼                                    ▼
    vuelve al paso 2 o 3     ┌──────────────────────────────────────┐
    con el fallo exacto      │ 5. ¿El siguiente paso sale del       │
                             │    repo local? (push, migración,     │
                             │    producción)                       │
                             └──────┬─────────────────────┬─────────┘
                                 no │                     │ sí
                                    │                     ▼
                                    │   ┌─────────────────────────────┐
                                    │   │ 6. APROBACIÓN HUMANA        │
                                    │   │  permiso "ask" → OK de Jonta│
                                    │   │  merge a main = Jonta revisa│
                                    │   │  el PR (un informe de       │
                                    │   │  subagente NO es aprobación)│
                                    │   └──────────────┬──────────────┘
                                    ▼                  ▼
 ┌─────────────────────────────────────────────────────────────────────┐
 │ 7. RAMA → COMMIT → PR → CI (Postgres efímero: los e2e sin riesgo)   │
 │    → merge → Vercel/Render despliegan solos                         │
 └───────────────────────────────┬─────────────────────────────────────┘
                                 ▼
 ┌─────────────────────────────────────────────────────────────────────┐
 │ 8. REGISTRO DE DECISIÓN   node .claude/audit.mjs decision '{...}'   │
 │    problema · causa_raiz · por_que · alternativas_descartadas ·     │
 │    verificacion · no_verificado · aprobacion.ref · commit           │
 └───────────────────────────────┬─────────────────────────────────────┘
                                 ▼
 ┌─────────────────────────────────────────────────────────────────────┐
 │ 9. RESPUESTA A JONTA: qué cambió, por qué, qué quedó sin verificar  │
 └─────────────────────────────────────────────────────────────────────┘
```

## Por qué está armado así

- **Diagnosticar y arreglar son pasos separados.** El diagnóstico no puede editar, así que investiga sin riesgo, y el agente principal recibe una causa confirmada, no una suposición.
- **Quien arregla no se aprueba a sí mismo.** El verificador tiene otro contexto y parte del `git diff` real, no de lo que el principal dice que cambió.
- **El qué lo registran los hooks; el porqué, el agente.** Los hooks son automáticos y no dependen de que el modelo se acuerde. El porqué solo puede escribirlo el agente (paso 8).
- **El permiso crece con el riesgo.** Leer y testear está libre; lo que sale de la máquina pide confirmación; lo irreversible está prohibido.
- **La verificación final de lo que toca datos ocurre en CI.** Es el único entorno donde los e2e corren contra una base descartable.

## Dónde se rompió (revisión del 2026-09-28) y cómo quedó

| Paso | Qué falló | Estado |
|---|---|---|
| 0 | Una sesión abierta desde otra carpeta no cargó los hooks del repo: el registro no tenía nada de ese día | ✅ Hooks globales en `~/.claude/settings.json` (`audit.mjs hook --global`). Solo registran sesiones que tocan JobTrackr, y no duplican cuando la sesión se abre desde este repo. ⚠️ Los **permisos** siguen siendo del repo: conviene abrir las sesiones desde aquí. |
| 4 | El Nivel B corre contra la base Neon compartida con producción | ⏳ Pendiente: branch `dev` en Neon (lo tiene que crear Jonta). Mientras tanto, el verificador marca el Nivel B local como "no ejecutado" y lo valida en CI. |
| 4 | El verificador dijo que los e2e "crean y limpian" sus usuarios, y no limpiaban | ✅ `e2e/global-teardown.ts` borra los usuarios creados e imprime `[e2e] limpieza: N/M`. El verificador copia esa línea en vez de afirmarlo. |
| 8 | No se escribió el registro `decision` del commit del rediseño de headers | ⚠️ No se puede reconstruir con un `aprobacion.ref` válido porque el prompt no se registró. Queda documentado aquí y en PLAN.md. |
