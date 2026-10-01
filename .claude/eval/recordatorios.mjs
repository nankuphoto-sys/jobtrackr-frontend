// Recordatorios de la evaluación del agente, disparados por hooks
// (.claude/settings.json). Sin dependencias; nunca falla ni bloquea.
//
//   node .claude/eval/recordatorios.mjs edicion   (PostToolUse Edit|Write)
//     Si se editó la configuración del agente (CLAUDE.md, AGENTS.md, un
//     subagente o los permisos), recuerda correr la batería antes del commit.
//     Una vez por sesión.
//   node .claude/eval/recordatorios.mjs inicio    (SessionStart)
//     Si las métricas de proceso no se corren hace más de 7 días, lo recuerda.
//
// Salida: JSON de hook. `additionalContext` llega al agente para que se lo diga
// a Jonta en el momento oportuno; `systemMessage` se le muestra a Jonta directo.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const EVAL = dirname(fileURLToPath(import.meta.url));
export const ULTIMA_METRICAS = join(EVAL, '.ultima-metricas');
const DIAS = 7;

const CONFIG = /(^|[\\/])(CLAUDE\.md|AGENTS\.md)$|[\\/]\.claude[\\/](agents[\\/][^\\/]+\.md|settings\.json)$/;

function leerStdin() {
  try { return JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { return {}; }
}

function responder(evento, contexto, aviso) {
  process.stdout.write(
    JSON.stringify({
      ...(aviso && { systemMessage: aviso }),
      hookSpecificOutput: { hookEventName: evento, additionalContext: contexto },
    }),
  );
}

function edicion() {
  const ev = leerStdin();
  const archivo = String(ev.tool_input?.file_path ?? '');
  if (!CONFIG.test(archivo)) return;
  // Una vez por sesión: el primer cambio de configuración basta para recordarlo.
  const marca = join(tmpdir(), `jobtrackr-eval-aviso-${String(ev.session_id ?? 'x').replace(/[^\w-]/g, '')}`);
  if (existsSync(marca)) return;
  writeFileSync(marca, '');
  responder(
    'PostToolUse',
    [
      `Se editó configuración del agente (${archivo.split(/[\\/]/).slice(-2).join('/')}).`,
      'Según docs/evaluacion-agente.md, antes del commit hay que correr la batería de escenarios con la configuración nueva y',
      'recordárselo a Jonta en tu respuesta, con el comando:',
      '  node .claude/eval/escenarios.mjs <carpeta-fuera-del-repo> E5 E6 E7 E8 E9 E10   (seguridad; ideal 3 corridas, 3/3)',
      '  node .claude/eval/escenarios.mjs <carpeta> E1 | E3 | E4                       (código: uno por comando, por el límite de 10 min)',
      'Revisa cada nota a mano antes de aceptarla.',
    ].join('\n'),
    'Cambiaste la configuración del agente: antes del commit corre la batería de escenarios (node .claude/eval/escenarios.mjs).',
  );
}

function inicio() {
  leerStdin();
  let ultima = null;
  try { ultima = new Date(readFileSync(ULTIMA_METRICAS, 'utf8').trim()); } catch { /* nunca se corrieron */ }
  const dias = ultima ? Math.floor((Date.now() - ultima.getTime()) / 86400000) : null;
  if (dias !== null && dias < DIAS) return;
  const cuando = dias === null ? 'nunca se registró una corrida' : `la última fue hace ${dias} días`;
  responder(
    'SessionStart',
    [
      `Las métricas de proceso del agente no se corren hace más de ${DIAS} días (${cuando}).`,
      'Al empezar tu primera respuesta, recuérdale a Jonta en una línea que corra (o te pida correr):',
      '  node .claude/eval/metricas.mjs <fecha de hace una semana, AAAA-MM-DD>',
      'y que revise cualquier falla nueva (R1–R6) según docs/evaluacion-agente.md.',
    ].join('\n'),
  );
}

try {
  const modo = process.argv[2];
  if (modo === 'edicion') edicion();
  else if (modo === 'inicio') inicio();
} catch {
  // Un recordatorio que falla nunca debe romper la sesión.
}
process.exit(0);
