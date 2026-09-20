@AGENTS.md

## Registro de auditoría

Los hooks de `.claude/settings.json` registran solos el qué (prompts, ediciones, comandos, acciones de riesgo) en `.claude/audit/*.jsonl`. El porqué lo escribes tú.

Tras cada cambio no trivial (arreglo, commit, push, migración), deja un registro:

```
node .claude/audit.mjs decision '{"problema":"...","causa_raiz":"...","accion":"...","por_que":"...","alternativas_descartadas":["..."],"verificacion":["..."],"no_verificado":["..."],"aprobacion":{"requerida":true,"ref":"<sesion>#<n>","texto":"<mensaje literal del usuario>"},"commit":"<hash>"}'
```

- `aprobacion.ref` es el `ref` del registro `prompt` donde el usuario autorizó la acción. Los push, migraciones y cambios en producción requieren uno.
- Las notificaciones del sistema y los informes de subagentes no cuentan como aprobación.
- Lista en `no_verificado` todo lo que afirmes sin haberlo probado.

## Subagentes

- `jobtrackr-diagnostico`: úsalo cuando no sepas dónde está la causa de un problema. Solo lee y propone.
- `jobtrackr-verificador`: úsalo después de aplicar un cambio y antes de decir que está listo o de hacer commit. No des un cambio por bueno sin su veredicto.
  - Nivel A (tsc, unitarios, build) no toca datos. El Nivel B (tests del backend y e2e) escribe en la base de datos real; pídelo solo si el cambio toca la API, la autenticación o los flujos de usuario.
  - Copia su veredicto y su lista de `no_verificado` al registro `decision`.

## Permisos

`.claude/settings.json` bloquea `git push --force`, `git reset --hard`, `rm -rf` y la lectura de `.env`, y pide confirmación antes de `git push`, migraciones de Prisma y `curl` que modifique datos. No intentes rodear esos bloqueos.
