# Plano: issues del importador de tiempos

**Materia prima:** un issue de GitHub de `Maikel-mg/importador-tiempos` con etiqueta `ready-for-agent`.
**Producto:** una PR sobre `develop` con los tests y el código, el issue comentado con el enlace, y el cuerpo de la PR relleno con el template del repo. Nunca mergeada.
**Se lanza:** las dos formas.
- Como skill: en pi, «pasa el issue #128 por la fábrica».
- Como proceso: `./fabrica.sh 128` (o sin número, coge el siguiente `ready-for-agent` más antiguo).

## Los cuatro bloques

```
CEREBRO        → AGENTS.md · que-es-bien · contexto · lecciones · ejemplos/
                 (lee también los docs del repo: CONTEXT.md, WEB_ARCHITECTURE.md,
                  docs/MAP.md, docs/adr/, .github/pull_request_template.md)
CONSTRUCCIÓN   → 01 entrar → 02 plan ─[si toca SQL]─ ⏸ 03 puerta-sql → 04 implementar
LOOP           → 05 verificar (código) ✗ vuelve a 04 (máx. 2)
                 06 revisar (agente ≠ 04) ✗ vuelve a 04 (máx. 2)
DESPLIEGUE     → 07 preparar-pr → 08 abrir-pr → 09 informe · ⏸ el merge espera tu OK
```

## Pasos

| # | Paso | Tipo | Entrada | Salida | Comprobación (si falla, para) | Si falla vuelve a |
|---|---|---|---|---|---|---|
| 01 | entrar | código | número de issue | `runs/<id>/issue.json` | el issue está abierto · lleva `ready-for-agent` · ninguna issue de su «Blocked by» sigue abierta · tiene ≥1 criterio de aceptación · dice si toca SQL Server | — (para con el motivo) |
| 02 | plan | agente | `issue.json` | `runs/<id>/plan.md` | declara el **radio** (lista de ficheros que va a tocar, no vacía) · cada criterio de aceptación apunta a un test o a una verificación concreta · marca `toca_sql` · si el issue es ambiguo, lo dice en vez de inventar | 02 (máx. 1) |
| 03 | puerta-sql | **tú** | `plan.md` con `toca_sql: true` | `runs/<id>/ok-sql` | solo aparece en issues que tocan `sp-builder.ts`, `sql-executor.ts`, `.sql` o datos reales | — (espera tu OK) |
| 04 | implementar | agente | `plan.md` (+ `devuelto.md` si es un reintento) | rama `factory/<issue>-<slug>` con tests y código, commiteada | lo comprueba 05 | 05 devuelve aquí |
| 05 | verificar | código | rama | `runs/<id>/verificar.json` + log | `lint` + `test` verdes en backend y `lint` + `type-check` + `test:run` verdes en web-ui · el diff **solo** toca ficheros del radio · el diff no toca `fabrica/` ni `cerebro/` · lista los componentes presentacionales de más de 150 líneas | 04 (máx. 2) |
| 06 | revisar | agente (≠ 04) | diff de la rama + `plan.md` + rúbrica | `runs/<id>/revision.json` | cada criterio de la rúbrica CUMPLE, con evidencia · cada criterio de aceptación tiene su test · «Qué NO se hizo» es honesto | 04 (máx. 2) |
| 07 | preparar-pr | código | rama + `plan.md` + `verificar.json` | `runs/<id>/pr.md` | rellena las cinco secciones del template del repo · «Qué NO se hizo» no está vacío · incluye `Closes #N` | — |
| 08 | abrir-pr | código | rama + `pr.md` | PR abierta + comentario en el issue | la PR existe, apunta a `develop` y enlaza el issue | — (para) |
| 09 | informe | agente (no ha producido nada) | `runs/<id>/` | `runs/<id>/informe.md` | sigue la plantilla | — |

**Presupuesto de vueltas:** 04 ↔ 05 ↔ 06 comparten 2 vueltas en total. A la tercera, la cadena para y te avisa con lo que queda sin resolver.

## Puertas humanas

- **03 puerta-sql:** solo en issues que tocan SQL Server o datos. La fábrica nunca ejecuta SQL contra la base de datos real: escribe código y tests, y te pide permiso para seguir cuando el cambio va a afectar a algo que ya funciona contra tu BD.
- **Merge de la PR:** la fábrica abre la PR y comenta el issue, pero no mergea. Abrir una PR no cambia nada para nadie; mergear sí.
- **La fábrica nunca:** mergea, despliega, ejecuta SQL contra la BD, hace `push` a `main`/`develop`, ni toca nada fuera de su rama `factory/`.

## Telemetría

Automática en cada paso: duración, resultado, log e intentos.

Métricas (las apunta solo el código, para que no se cuenten dos veces):
- `01`: `criterios_aceptacion`, `toca_sql`, `bloqueado`.
- `05`: `tests_nuevos`, `ficheros_tocados`, `lineas_diff`, `componentes_largos`.
- `08`: `pr` (número de PR).

Qué vigilar en `obs.py resumen`:
- **Reintentos de 04:** si suben, al paso 02 le falta contexto o al cerebro le faltan lecciones.
- **Devoluciones de 06 por el mismo criterio dos veces:** falta ese criterio en `que-es-bien.md`, no en el implementador.
- **`componentes_largos` bajando:** el implementador está partiendo por número de líneas en vez de por responsabilidad.
- **Tiempo de 02:** si crece, está leyendo el repo entero en vez de ir por `docs/MAP.md`.

## Coste

Con tu plan (pi + opencode go) el coste marginal por ejecución es ~0: es suscripción, no tokens. Lo que se gasta es **tiempo**: entre 6 y 12 minutos por ejecución (02, 04, 06 y 09 son los lentos).

Si algún día pasas a API de pago: 02, 04 y 06 con el modelo bueno, 09 con uno barato. Estimación: 0,40–1,20 $ por ejecución.

## Dos decisiones que conviene tener escritas

- **La fábrica vive dentro del repo** (`fabrica/`). Sus ficheros se commitean en `develop`, así que toda rama nueva los hereda. `fabrica/runs/` va en `.gitignore`: cambiar de rama no borra las ejecuciones.
- **El radio manda.** Si el issue pide algo que obliga a salir del radio declarado, la fábrica no lo hace: lo apunta en «Qué NO se hizo» y lo deja para otro issue. Es la regla que evita que una PR de 120 líneas se convierta en una de 900.
