# Qué es bien: issues del importador de tiempos

## El producto

Una PR sobre `develop`, lista para que la mergee una persona, que resuelve **un** issue y solo ese.

Buena significa cinco cosas:
1. Hace lo que piden los criterios de aceptación del issue, ni más ni menos.
2. Lleva tests que expresan esos criterios.
3. No se sale del radio declarado en el plan.
4. El cuerpo de la PR se puede leer en un minuto: qué cambia, qué no, qué se ve distinto y cómo comprobarlo.
5. CI verde en los dos paquetes.

## Ejemplos

**Buenos**
- `ejemplos/pr-169.md` · el mejor. Cuerpo denso y concreto, «Qué NO se hizo» de verdad, tests nombrados uno a uno, y explica el bug que cierra. Fíjate en cómo justifica cada decisión en lugar de describir el diff.
- `ejemplos/pr-141.md` · correcto y corto. «Cambio observable: **No**» sin vergüenza porque era una función sin consumidores todavía. Ese es el tono.

**Malos**
- `ejemplos/pr-167.md` y `ejemplos/pr-168.md` · los abrió una fábrica anterior y el cuerpo está sin rellenar: `(completar)` en las cinco secciones, `\n` escapados en vez de saltos de línea, `#null` en el `Closes`. El código podía estar bien; la PR es inservible porque quien la revisa no sabe qué mira. **No es un fallo de redacción: es un fallo del paso que generó el cuerpo.**

## Criterios comprobables con código

Cada uno para la cadena y devuelve el trabajo al paso 04.
- [ ] Backend: `npm run lint`, `npm run build:backend`, `npm test` en verde.
- [ ] web-ui: `npm run lint`, `npm run type-check`, `npm run test:run` en verde.
- [ ] Hay al menos un test nuevo, y toca la lógica que añade el cambio.
- [ ] El diff solo contiene ficheros del radio declarado en `plan.md`.
- [ ] El diff no toca `fabrica/` ni `cerebro/` (la fábrica no se reescribe a sí misma).
- [ ] El cuerpo de la PR tiene las cinco secciones del template rellenas, sin `(completar)` y con saltos de línea reales.

## Criterios de juicio (rúbrica del paso 06)

El revisor puntúa cada uno CUMPLE / NO CUMPLE, con una línea de motivo. Si algo no cumple, lo devuelve al paso 04 sin arreglarlo.

1. **Criterios de aceptación.** Cada uno del issue tiene una evidencia concreta: un test con su nombre, o una línea del diff. No vale «se ha implementado».
2. **Radio respetado.** Lo que se toca está en el radio declarado y lo que se toca es lo necesario. Si el implementador se salió, es NO CUMPLE aunque el código esté bien.
3. **«Qué NO se hizo» honesto.** Enumera lo que quedó fuera y por qué. Vacío o «nada» solo si de verdad no quedó nada.
4. **Vocabulario de `CONTEXT.md`.** *Tarea* (no Task), *Registro de tiempo*, *Configuración* (no Ajustes), *SpBuilder*. Los nombres nuevos no inventan sinónimos de términos que ya existen.
5. **Arquitectura de `WEB_ARCHITECTURE.md`.** HTTP por `ApiClient`, features por dominio, hook profundo en vez de trocear por número de líneas, `ports.ts`/`adapters.ts` donde ya se usa.
6. **Tests que prueban algo.** Un test por criterio de aceptación, con nombres que explican la regla. Tests que repiten la implementación no cuentan.
7. **Cambio observable contestado.** Qué ve el usuario distinto, o `no` si es refactor. Si dice `no`, el revisor comprueba que de verdad no hay cambio de comportamiento.

## Señales de rechazo (no bloquean por sí solas, el revisor las nombra)

- Cambios fuera del radio, aunque sean «de paso» y estén bien.
- Nombres que contradicen `CONTEXT.md`.
- Un `.snap` actualizado sin explicar por qué.
- Un componente presentacional que pasa de 150 líneas **sin un sub-seam real**. El número es una señal para mirar, no un bloqueo: en hooks, la cohesión manda.
- Comentarios que repiten lo que el código ya dice.

## Fuera de alcance

- **No refactoriza** código que el issue no pide, aunque sea mejorable.
- **No actualiza `docs/MAP.md` ni los ADR** salvo que el issue lo pida.
- **No ejecuta SQL** contra ninguna base de datos, ni «solo para probar».
- **No hace `rebase`, `force-push`, ni toca ramas que no sean la suya.**
- **No mergea ni despliega.**
