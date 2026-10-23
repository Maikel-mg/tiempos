## Qué cambia

<!-- Una frase. Referencia la issue: Closes #NN -->

## Qué NO se hizo

<!-- Lo que la issue pedía y no entra aquí, y por qué. Esto es lo que evita que la revisión posterior cueste más que escribirlo. -->

## Cambio observable

<!-- "no" o "sí: <qué ve el usuario>". Si toca sp-builder.ts, sql-executor.ts, IndexedDB o ConfigStore, dilo aunque sea "no". -->

## Cómo verificarlo en 2 minutos

<!-- Pasos concretos. Si no hay ninguno, el cambio no es observable y basta con el CI. -->

## Checklist

- [ ] `lint` + `type-check` + `test` verdes en ambos paquetes (CI)
- [ ] Test cubre la lógica nueva (rama, bucle, parser, dinero o seguridad)
- [ ] `.snap` intacto, o actualizado con una línea explicando por qué
- [ ] No escribe fuera del radio declarado en la issue
