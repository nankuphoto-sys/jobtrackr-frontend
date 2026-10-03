// Guardas del agente: hook PreToolUse (Bash y PowerShell) que BLOQUEA comandos
// peligrosos revisando el comando completo con un patrón.
//
// Por qué no alcanza con `permissions.deny`: las reglas de permisos comparan el
// comienzo del comando. `Bash(git push --force:*)` bloquea `git push --force
// origin main`, pero no `git push origin main --force`, `git push -uf ...`,
// `git push --force-with-lease` ni `git push origin +main`, que reescriben la
// historia remota igual. Y una regla `Bash(...)` no aplica a la herramienta
// PowerShell: el 2026-10-03 se vio que commits y push hechos desde PowerShell
// no pasaban por ninguna regla ni hook.
//
// Bloquea: push forzado, `git reset --hard` y borrado recursivo (rm -rf / rm -fr,
// Remove-Item -Recurse y sus alias).
//
// Uso (desde .claude/settings.json): node .claude/guardas.mjs
// Lee el evento por stdin. Si bloquea, responde con permissionDecision "deny"
// y el motivo; si no, no imprime nada. Si algo falla, no bloquea (exit 0).
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SHELLS = new Set(['Bash', 'PowerShell']);

// Cada tramo del comando se revisa por separado: ; && || | (Bash y PowerShell)
// y llaves, para que `if ($?) { git push -f }` de PowerShell deje el git suelto.
const TRAMOS = /;|&&|\|\||\||\{|\}/;

// Prefijos que no cambian qué se ejecuta: asignaciones de entorno (VAR=x) y el
// operador de llamada de PowerShell (& git ...).
const PREFIJO = /^\s*(?:&\s*)?(?:\S+=\S+\s+)*/;

// `git [opciones globales] <subcomando> <args>`
const gitSub = (sub) => new RegExp(`${PREFIJO.source}git(?:\\.exe)?\\b(?:\\s+-C\\s+\\S+|\\s+-c\\s+\\S+|\\s+--\\S+)*\\s+${sub}\\b(.*)$`, 'i');
const GIT_PUSH = gitSub('push');
const GIT_RESET = gitSub('reset');

// Señales de push forzado dentro de los argumentos del push.
const FORZADO = [
  /(^|\s)--force(-with-lease|-if-includes)?\b/, // --force, --force-with-lease, --force-if-includes
  /(^|\s)-[a-zA-Z]*f[a-zA-Z]*\b/, // -f, -uf, -fu
  /(^|\s)["']?\+[^\s]+/, // refspec con +: +main, +rama:main, "+main"
];

// rm con -r/-R y -f en cualquier orden o separados (rm -rf, rm -fr, rm -r -f, rm -Rf).
const RM_RF = (tramo) => {
  const m = tramo.match(/^\s*(?:sudo\s+)?rm\s+(.*)$/);
  if (!m) return false;
  const flags = m[1].split(/\s+/).filter((a) => /^-[a-zA-Z]+$/.test(a)).join('');
  return /[rR]/.test(flags) && /f/.test(flags) || /--recursive/.test(m[1]) && /--force|-\w*f/.test(m[1]);
};
// Remove-Item y sus alias con -Recurse (o abreviado: -r, -rec). En PowerShell
// `rm` es alias de Remove-Item, así que `rm -r carpeta` también entra acá.
const REMOVE_ITEM = /^\s*(?:&\s*)?(Remove-Item|ri|rm|del|erase|rmdir|rd)\b.*\s-r\w*/i;

// El texto entre comillas es un argumento, no un comando: antes de partir en
// tramos se neutralizan los separadores y espacios de adentro (→ "_"). Si no,
// `git commit -m "fix: a; rm -rf b"` se bloqueaba por el `; rm -rf` del mensaje.
// No se vacía del todo porque `git push origin "+main"` sigue siendo forzado. De
// paso, `git -C "mi carpeta" push -f` queda como una sola palabra y se reconoce.
const CITAS = /"(?:[^"\\]|\\.)*"|'[^']*'/g;
const neutralizar = (cmd) => cmd.replace(CITAS, (c) => c.replace(/[;|&{}\s]/g, '_'));

export function motivoBloqueo(comando) {
  for (const tramo of neutralizar(String(comando)).split(TRAMOS)) {
    const t = tramo.trim();
    const push = t.match(GIT_PUSH);
    if (push && FORZADO.some((r) => r.test(push[1]))) {
      return `Push forzado bloqueado por .claude/guardas.mjs: "${t.slice(0, 120)}". Reescribir la historia remota no se hace desde el agente. Si de verdad hace falta, explícale a Jonta por qué y que lo ejecute él.`;
    }
    const reset = t.match(GIT_RESET);
    if (reset && /(^|\s)--hard\b/.test(reset[1])) {
      return `git reset --hard bloqueado por .claude/guardas.mjs: "${t.slice(0, 120)}". Borra cambios sin commit de forma irreversible. Usa git stash o una rama nueva, o pídele a Jonta que lo ejecute.`;
    }
    if (RM_RF(t) || REMOVE_ITEM.test(t)) {
      return `Borrado recursivo bloqueado por .claude/guardas.mjs: "${t.slice(0, 120)}". No se borran carpetas enteras desde el agente. Borra archivos puntuales o pídele a Jonta que lo haga.`;
    }
  }
  return null;
}

function main() {
  let ev = {};
  try { ev = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { return; }
  if (!SHELLS.has(ev.tool_name)) return;
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
