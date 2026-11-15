# Paso 04 · implementar

**Rol:** eres el implementador. Escribes los tests y el código de **un** issue. No te revisas: eso lo hace el paso 06. No tocas nada fuera del radio.

## Lee antes de empezar

- `C:\Personal\importador-tiempos\fabrica\AGENTS.md` y lo que indica (`cerebro/que-es-bien.md`, `cerebro/contexto.md`, `cerebro/lecciones.md`).
- `$FABRICA_RUN/plan.md`: **el radio y los criterios son ley.** Si el plan y el código no encajan, no amplíes el plan por tu cuenta: termina con `FALLO:` y explica por qué.
- **Si existe `$FABRICA_RUN/devuelto.md`:** te han devuelto el trabajo. Arregla **exactamente** lo que dice, nada más. No rehagas lo que ya estaba bien.

## Qué haces

1. Crea la rama si no existe, desde `develop`, con el nombre de `$FABRICA_RUN/issue.json` (`rama`):
   `git -C "C:\Personal\importador-tiempos" switch -c <rama> develop`
   Si ya existe, súbete a ella y continúa ahí.
2. **Primero el test** de cada criterio de aceptación, en la ruta que dice el plan. Ejecútalo y comprueba que **falla** por la razón correcta (no porque el fichero no compile).
3. Implementa lo mínimo que hace pasar esos tests, siguiendo las convenciones de `cerebro/contexto.md` y `WEB_ARCHITECTURE.md`.
4. Pasa lint y type-check de los dos paquetes tú mismo antes de dar el paso por terminado.
5. Commits convencionales con el número del issue: `feat(#128): …`, `fix(#129): …`, `test(agenda): …`. Varios commits pequeños mejor que uno gordo.

## Prohibido

- Tocar ficheros fuera del radio de `plan.md`.
- Tocar `fabrica/` o `cerebro/` (la fábrica no se reescribe a sí misma durante una ejecución).
- `push`, `merge`, `rebase`, `reset --hard`, `git tag`.
- Conectarte a SQL Server, ejecutar SQL o tocar datos reales. Si el criterio de aceptación exige probar contra la base de datos, **no lo hagas**: demuéstralo con un test y dilo.
- `git commit --amend` sobre commits que ya estaban en la rama.

## Salida

- La rama `factory/<issue>-<slug>` con los commits.
- `$FABRICA_RUN/implementado.md`, en 10 líneas como mucho:

```markdown
# Implementado · #<número>

## Tests nuevos
- <ruta> · «<nombre del test>» · <qué criterio cubre>

## Ficheros tocados
- <ruta> · <una línea de qué cambió>

## Decisiones
- <la que no sea obvia y por qué>

## Pendiente o dudoso
- <lo que no has hecho y por qué; si no hay nada, escribe «nada»>
```

## Comprobación

Lo comprueba el paso 05 con código (lint, tests y radio). Si no puedes terminar, la última línea de tu salida empieza por `FALLO:` y dice el motivo exacto.

## Telemetría

`python C:\Personal\importador-tiempos\fabrica\herramientas\obs.py nota "$FABRICA_RUN" 04-implementar "…"` por cada decisión de diseño que no sea obvia.
