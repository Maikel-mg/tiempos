# Fábrica: issues del importador de tiempos

Entra **un issue de GitHub** con etiqueta `ready-for-agent` y sale **una PR sobre `develop`** con los tests, el código y el cuerpo relleno, más un comentario en el issue. Nunca mergeada.

## Antes de hacer nada, lee

1. `fabrica/cerebro/que-es-bien.md`: qué es un buen resultado aquí. Todo se mide contra esto.
2. `fabrica/cerebro/contexto.md`: dónde está cada cosa y cómo se comprueba.
3. `fabrica/cerebro/lecciones.md`: errores que ya se cometieron. **No repitas ninguno.**
4. `fabrica/PLANO.md`: los pasos, su orden y qué comprueba cada uno.

## Reglas de la fábrica

- **Un puesto, una tarea.** Haz solo el paso que te toca, con su entrada y su salida. No te adelantes al siguiente.
- **Quien implementa no revisa.** El paso 06 revisa y devuelve; nunca arregla. El paso 04 arregla; nunca se aprueba a sí mismo.
- **El radio manda.** Si algo se sale del radio declarado en `plan.md`, no se hace: se apunta en «Qué NO se hizo» y se deja para otro issue.
- **Todo se arregla una vez.** Cuando la persona corrija algo, o un revisor encuentre un fallo nuevo, sigue `fabrica/MEJORAR.md`.
- **Nada sale fuera sin OK.** Mergear, desplegar, hacer `push` a `develop` o `main`, ejecutar SQL contra la base de datos: espera a la persona. Abrir la PR sí lo hace la fábrica (paso 08), porque no cambia nada para nadie.
- **Si no sabes, para.** Si te falta información para hacer bien el paso, no la inventes: termina con una última línea que empiece por `FALLO:` y di qué falta.

## Rutas

- Fábrica: `C:\Personal\importador-tiempos\fabrica`
- Proyecto: `C:\Personal\importador-tiempos` (todo `git` va con `git -C "C:\Personal\importador-tiempos"`)
- Ejecución: la variable `FABRICA_RUN`, con la forma `fabrica/runs/<fecha>-<id>`

## Intérprete

En este Windows **`python3` no existe**: usa `python`.

## Telemetría (obligatoria)

Todo paso se ejecuta a través de `python fabrica/herramientas/obs.py paso`, que guarda su log, su duración y su resultado en `runs/<id>/`.

- **Cada decisión que tomes por tu cuenta:** `python fabrica/herramientas/obs.py nota "$FABRICA_RUN" <paso> "qué decidiste y por qué"`.
- **Las cifras las apunta el código**, no tú: así no se cuentan dos veces.
- **Si fallas,** la última línea de tu salida es el motivo, en una frase. Es lo que verá el resumen.
- **Salud de la fábrica:** `python fabrica/herramientas/obs.py resumen`.
