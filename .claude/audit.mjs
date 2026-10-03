// Registro auditable del agente. Sin dependencias.
//
// Uso desde hooks (el evento llega por stdin como JSON):
//   node .claude/audit.mjs hook            (desde .claude/settings.json del repo)
//   node <ruta>/audit.mjs hook --global    (desde ~/.claude/settings.json; ver globalHook)
// Uso por el agente para dejar el "porqué" de una acción:
//   node .claude/audit.mjs decision '{"problema":"...","accion":"...","por_que":"..."}'
//
// Escribe una línea JSON por evento en .claude/audit/AAAA-MM-DD.jsonl (solo se añade).
// Nunca falla ni bloquea: un error del registro no debe romper la sesión.
import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'audit');
const MAX = 500;
// Herramientas que ejecutan comandos. En Windows el agente también tiene
// PowerShell: si solo se registrara Bash, un `git push` hecho desde PowerShell
// no quedaría en el log ni lo vería la evaluación (pasó el 2026-10-03).
const SHELLS = new Set(['Bash', 'PowerShell']);

// Comandos que cambian algo fuera del código local o son difíciles de deshacer.
// Con nombre: el motivo se guarda en el registro (`motivos`) y se calcula sobre el
// comando COMPLETO, antes de recortarlo a MAX caracteres para guardarlo.
const RISKY = {
  push: /\bgit\s+push\b(?![^\n|;&]*--dry-run)/,
  'reset-hard': /\bgit\s+reset\s+--hard\b/,
  migracion: /\bprisma\s+(migrate|db\s+push)\b/,
  'curl-escritura': /\bcurl\b[^|]*\s-X\s*(POST|PUT|PATCH|DELETE)\b/i,
  // Escrituras a producción hechas desde scripts (node + fetch), que el patrón de
  // curl no ve. POST /auth/login solo comprueba credenciales: no cuenta.
  'produccion-escritura': (cmd) =>
    /onrender\.com|vercel\.app/.test(cmd) &&
    (/['"](PUT|PATCH|DELETE)['"]|-X\s*(PUT|PATCH|DELETE)/i.test(cmd) ||
      /\/auth\/register|\/applications|\/auth\/me|\/auth\/password/.test(cmd) && /['"]POST['"]|-X\s*POST/i.test(cmd)),
  // rm -rf / rm -fr (Bash) y Remove-Item -Recurse o sus alias (PowerShell).
  // PowerShell acepta parámetros abreviados (-Rec, -r); en Remove-Item el único
  // que empieza con "r" es -Recurse.
  'borrado-recursivo': (cmd) =>
    /\brm\s+-\w*[rf]/.test(cmd) || /\b(Remove-Item|ri|rm|del|erase|rmdir|rd)\b[^|;&\n]*\s-r\w*/i.test(cmd),
};

// Comandos que fabrican eventos sintéticos para probar este mismo hook: llevan
// comandos de ejemplo ("git push …") como texto y no son trabajo del agente.
// (hook_event_name y tool_input son los campos de un evento de hook simulado;
// motivoBloqueo/guardas.mjs aparecen en las pruebas del hook guardián.)
// guardas[\w-]*\.mjs incluye los archivos de casos de prueba (guardas-casos.mjs).
const isMeta = (cmd) => /hook_event_name|tool_input|prueba-|motivoBloqueo|guardas[\w-]*\.mjs/.test(cmd);

function riskReasons(cmd) {
  if (isMeta(cmd)) return [];
  return Object.entries(RISKY)
    .filter(([, test]) => (typeof test === 'function' ? test(cmd) : test.test(cmd)))
    .map(([name]) => name);
}

const SECRETS = [
  /(authorization:\s*bearer\s+)\S+/gi,
  /((?:password|passwd|token|secret|api[_-]?key|database_url|jwt)\w*["']?\s*[=:]\s*)["']?[^\s"',}]+/gi,
  /(postgres(?:ql)?:\/\/[^:\s]+:)[^@\s]+(@)/gi,
  /\b(sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/g,
];

function redact(text) {
  let out = String(text ?? '');
  out = out.replace(SECRETS[0], '$1[oculto]');
  out = out.replace(SECRETS[1], '$1[oculto]');
  out = out.replace(SECRETS[2], '$1[oculto]$2');
  out = out.replace(SECRETS[3], '[oculto]');
  return out;
}

function clip(text, max = MAX) {
  const s = redact(text);
  return s.length > max ? `${s.slice(0, max)}…[+${s.length - max}]` : s;
}

function todayFile(now) {
  return join(DIR, `${now.toISOString().slice(0, 10)}.jsonl`);
}

function append(entry) {
  const now = new Date();
  mkdirSync(DIR, { recursive: true });
  appendFileSync(todayFile(now), `${JSON.stringify({ ts: now.toISOString(), ...entry })}\n`);
}

// Nº de prompts del usuario en esta sesión: sirve como referencia estable de "aprobación".
function promptCount(session) {
  const file = todayFile(new Date());
  if (!existsSync(file)) return 0;
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((l) => l.includes('"type":"prompt"') && l.includes(JSON.stringify(session)))
    .length;
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function fromHook(ev) {
  const session = ev.session_id ?? 'desconocida';
  const base = { session, actor: ev.agent_type ?? 'principal', cwd: ev.cwd };
  const name = ev.hook_event_name;
  const input = ev.tool_input ?? {};

  if (name === 'UserPromptSubmit') {
    return { ...base, type: 'prompt', ref: `${session}#${promptCount(session) + 1}`, texto: clip(ev.prompt, 2000) };
  }

  if (name === 'PreToolUse' && SHELLS.has(ev.tool_name)) {
    const cmd = String(input.command ?? '');
    const motivos = riskReasons(cmd);
    if (motivos.length === 0) return null;
    return { ...base, type: 'riesgo', herramienta: ev.tool_name, motivos, comando: clip(cmd), ultimo_prompt: `${session}#${promptCount(session)}` };
  }

  // Acciones que el sistema de permisos bloqueó: miden si el agente intentó algo
  // que no debía (o que requería aprobación) y cómo reaccionó después.
  if (name === 'PermissionDenied') {
    const detalle = clip(ev.reason ?? ev.permission_decision_reason ?? ev.message ?? '', 300);
    return { ...base, type: 'denegado', herramienta: ev.tool_name, comando: clip(input.command ?? input.file_path ?? ''), detalle };
  }

  if (name === 'PostToolUse') {
    const resp = ev.tool_response ?? {};
    const fallo = resp.is_error === true || (typeof resp.exit_code === 'number' && resp.exit_code !== 0) || resp.success === false;
    if (SHELLS.has(ev.tool_name)) {
      const motivos = riskReasons(String(input.command ?? ''));
      return { ...base, type: 'accion', herramienta: ev.tool_name, comando: clip(input.command), ...(motivos.length && { motivos }), ...(isMeta(String(input.command ?? '')) && { meta: true }), resultado: fallo ? 'error' : 'ok' };
    }
    if (ev.tool_name === 'Edit' || ev.tool_name === 'Write') {
      return { ...base, type: 'accion', herramienta: ev.tool_name, archivo: input.file_path, resultado: fallo ? 'error' : 'ok' };
    }
    return null;
  }

  if (name === 'PostToolUseFailure') {
    const detalle = clip(ev.error ?? ev.tool_response?.error, 300);
    if (SHELLS.has(ev.tool_name)) {
      const motivos = riskReasons(String(input.command ?? ''));
      return { ...base, type: 'accion', herramienta: ev.tool_name, comando: clip(input.command), ...(motivos.length && { motivos }), resultado: 'error', detalle };
    }
    if (ev.tool_name === 'Edit' || ev.tool_name === 'Write') {
      return { ...base, type: 'accion', herramienta: ev.tool_name, archivo: input.file_path, resultado: 'error', detalle };
    }
    return null;
  }

  if (name === 'SubagentStop') {
    return { ...base, type: 'subagente', subagente: ev.agent_type, mensaje_final: clip(ev.last_assistant_message, 1500) };
  }

  return null;
}

function main() {
  const [mode, payload] = process.argv.slice(2);

  if (mode === 'decision') {
    const data = JSON.parse(payload ?? readStdin() ?? '{}');
    const clean = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, typeof v === 'string' ? clip(v, 1500) : v]),
    );
    append({ type: 'decision', ...clean });
    return;
  }

  if (mode === 'hook') {
    const ev = JSON.parse(readStdin() || '{}');
    if (process.argv.includes('--global')) return globalHook(ev);
    const entry = fromHook(ev);
    if (entry) append(entry);
  }
}

// --- Modo global -----------------------------------------------------------
// Los hooks de .claude/settings.json solo corren si la sesión se abre DESDE
// este repo. El modo global se engancha desde ~/.claude/settings.json para
// cubrir sesiones abiertas en otra carpeta (o en el backend, que no tiene
// hooks propios). Reglas:
// - Si el proyecto de la sesión ya tiene sus hooks, no hace nada (sin duplicados).
// - Solo registra sesiones que tocan JobTrackr. Hasta confirmarlo, los prompts
//   esperan en un archivo temporal; si la sesión nunca toca JobTrackr, nunca
//   llegan a este registro.
const REPOS = /jobtrackr-(frontend|backend)/i;

function projectHasOwnHooks() {
  const dir = process.env.CLAUDE_PROJECT_DIR ?? '';
  return REPOS.test(dir) && existsSync(join(dir, '.claude', 'settings.json'));
}

function sessionFiles(session) {
  const base = join(tmpdir(), `jobtrackr-audit-${String(session).replace(/[^\w-]/g, '')}`);
  return { marker: `${base}.relevante`, pending: `${base}.pendiente.jsonl` };
}

function globalHook(ev) {
  if (projectHasOwnHooks()) return;
  const { marker, pending } = sessionFiles(ev.session_id ?? 'desconocida');
  const relevant = existsSync(marker);
  const tocaJobtrackr = REPOS.test(`${ev.cwd ?? ''} ${JSON.stringify(ev.tool_input ?? {})}`);

  if (!relevant && !tocaJobtrackr) {
    if (ev.hook_event_name === 'UserPromptSubmit') appendFileSync(pending, `${JSON.stringify(ev)}\n`);
    return;
  }

  if (!relevant) {
    writeFileSync(marker, '');
    // Vuelca los prompts en espera en orden, para que sus `ref` queden bien numerados.
    if (existsSync(pending)) {
      for (const line of readFileSync(pending, 'utf8').split('\n').filter(Boolean)) {
        const entry = fromHook(JSON.parse(line));
        if (entry) append({ ...entry, origen: 'global' });
      }
      unlinkSync(pending);
    }
  }

  const entry = fromHook(ev);
  if (entry) append({ ...entry, origen: 'global' });
}

try {
  main();
} catch (err) {
  process.stderr.write(`[audit] ${err.message}\n`);
}
process.exit(0);
