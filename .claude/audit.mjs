// Registro auditable del agente. Sin dependencias.
//
// Uso desde hooks (el evento llega por stdin como JSON):
//   node .claude/audit.mjs hook
// Uso por el agente para dejar el "porqué" de una acción:
//   node .claude/audit.mjs decision '{"problema":"...","accion":"...","por_que":"..."}'
//
// Escribe una línea JSON por evento en .claude/audit/AAAA-MM-DD.jsonl (solo se añade).
// Nunca falla ni bloquea: un error del registro no debe romper la sesión.
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'audit');
const MAX = 500;

// Comandos que cambian algo fuera del código local o son difíciles de deshacer.
const RISKY = [
  /\bgit\s+push\b/,
  /\bgit\s+reset\s+--hard\b/,
  /\bprisma\s+(migrate|db\s+push)\b/,
  /\bcurl\b[^|]*\s-X\s*(POST|PUT|PATCH|DELETE)\b/i,
  /\brm\s+-\w*[rf]/,
];

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

  if (name === 'PreToolUse' && ev.tool_name === 'Bash') {
    const cmd = String(input.command ?? '');
    if (!RISKY.some((r) => r.test(cmd))) return null;
    return { ...base, type: 'riesgo', herramienta: 'Bash', comando: clip(cmd), ultimo_prompt: `${session}#${promptCount(session)}` };
  }

  if (name === 'PostToolUse') {
    const resp = ev.tool_response ?? {};
    const fallo = resp.is_error === true || (typeof resp.exit_code === 'number' && resp.exit_code !== 0) || resp.success === false;
    if (ev.tool_name === 'Bash') {
      return { ...base, type: 'accion', herramienta: 'Bash', comando: clip(input.command), resultado: fallo ? 'error' : 'ok' };
    }
    if (ev.tool_name === 'Edit' || ev.tool_name === 'Write') {
      return { ...base, type: 'accion', herramienta: ev.tool_name, archivo: input.file_path, resultado: fallo ? 'error' : 'ok' };
    }
    return null;
  }

  if (name === 'PostToolUseFailure') {
    const detalle = clip(ev.error ?? ev.tool_response?.error, 300);
    if (ev.tool_name === 'Bash') {
      return { ...base, type: 'accion', herramienta: 'Bash', comando: clip(input.command), resultado: 'error', detalle };
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
    const entry = fromHook(JSON.parse(readStdin() || '{}'));
    if (entry) append(entry);
  }
}

try {
  main();
} catch (err) {
  process.stderr.write(`[audit] ${err.message}\n`);
}
process.exit(0);
