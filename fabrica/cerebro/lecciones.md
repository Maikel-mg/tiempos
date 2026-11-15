# Lecciones

La fábrica lee este fichero antes de cada ejecución. Cada fallo se arregla **una sola vez**: si algo sale mal, se apunta aquí y no vuelve a pasar.

Formato (la más nueva arriba):

## <AAAA-MM-DD> · <paso afectado>
- **Qué pasó:** <el fallo, concreto>
- **Regla:** <qué hacer a partir de ahora, en imperativo>
- **Cómo se comprueba:** <qué revisor o comprobación lo vigila, si aplica>

---

## 2026-11-15 · 07 preparar-pr (de una fábrica anterior)
- **Qué pasó:** las PRs #167 y #168 se abrieron con el cuerpo sin rellenar: `(completar)` en las cinco secciones, `\n` escapados en lugar de saltos de línea y `#null` en el `Closes`. El código servía; la PR no se podía revisar.
- **Regla:** el cuerpo de la PR se genera escribiendo el texto con saltos de línea reales y sustituyendo el número del issue; nunca se concatena con `\n` literales ni se deja la plantilla en blanco.
- **Cómo se comprueba:** el paso 07 falla si el cuerpo contiene `(completar)`, `#null`, o un `\n` literal. Está en `que-es-bien.md` como criterio comprobable.

## 2026-11-15 · todos los pasos
- **Qué pasó:** en este Windows no existe `python3`, solo `python`. Todo lo copiado del kit llamaba a `python3`.
- **Regla:** usa `python` en scripts, instrucciones y comandos. Si algún día hay WSL o Linux, se puede volver a `python3`, pero entonces se cambia en un solo sitio: `FABRICA_PY`.
- **Cómo se comprueba:** el primer paso de código de cada ejecución falla en el acto si el intérprete no existe.
