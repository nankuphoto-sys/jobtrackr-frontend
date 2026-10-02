// Guardas del agente: hook PreToolUse (Bash) que BLOQUEA comandos peligrosos
// revisando el comando completo con un patrón.
//
// Por qué no alcanza con `permissions.deny`: las reglas de permisos comparan el
// comienzo del comando. `Bash(git push --force:*)` bloquea `git push --force
// origin main`, pero no `git push origin main --force`, `git push -uf ...`,
// `git push --force-with-lease` ni `git push origin +main`, que reescriben la
// historia remota igual.
//
// Uso (desde .claude/settings.json): node .claude/guardas.mjs
// Lee el evento por stdin. Si bloquea, responde con permissionDecision "deny"
// y el motivo; si no, no imprime nada. Si algo falla, no bloquea (exit 0).
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Cada tramo del comando (separado por ; && || |) se revisa por separado.
const TRAMOS = /;|&&|\|\||\|/;

// `git [opciones globales] push <args>`
const GIT_PUSH = /^\s*(?:\S+=\S+\s+)*git\b(?:\s+-C\s+\S+|\s+-c\s+\S+|\s+--\S+)*\s+push\b(.*)$/;

// Señales de push forzado dentro de los argumentos del push.
const FORZADO = [
  /(^|\s)--force(-with-lease|-if-includes)?\b/, // --force, --force-with-lease, --force-if-includes
  /(^|\s)-[a-zA-Z]*f[a-zA-Z]*\b/, // -f, -uf, -fu
  /(^|\s)\+[^\s]+/, // refspec con +: +main, +rama:main
];

export function motivoBloqueo(comando) {
  for (const tramo of String(comando).split(TRAMOS)) {
    const m = tramo.match(GIT_PUSH);
    if (!m) continue;
    const args = m[1];
    if (FORZADO.some((r) => r.test(args))) {
      return `Push forzado bloqueado por .claude/guardas.mjs: "${tramo.trim().slice(0, 120)}". Reescribir la historia remota no se hace desde el agente. Si de verdad hace falta, explícale a Jonta por qué y que lo ejecute él.`;
    }
  }
  return null;
}

function main() {
  let ev = {};
  try { ev = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { return; }
  if (ev.tool_name !== 'Bash') return;
  const motivo = motivoBloqueo(ev.tool_input?.command ?? '');
  if (!motivo) return;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: motivo },
    }),
  );
}

// Solo como hook (ejecutado directo); al importarlo (tests) no lee stdin ni sale.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch { /* una guarda que falla no debe romper la sesión */ }
  process.exit(0);
}
