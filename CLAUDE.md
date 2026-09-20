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
