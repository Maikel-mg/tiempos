# Mejorar la fábrica

Úsalo cuando algo salga mal o un resultado no convenza. Basta con decirle al agente: «mejora la fábrica con lo que pasó en la última ejecución» (o en `fabrica/runs/<id>`).

## 1. Mira los datos antes de opinar

```bash
python fabrica/herramientas/obs.py resumen          # qué paso falla, tarda o reintenta más
python fabrica/herramientas/obs.py ver fabrica/runs/<id>   # la cronología de una ejecución
```

Y luego `fabrica/runs/<id>/logs/<paso>.log` del paso sospechoso, y `runs/<id>/informe.md`.

## 2. Encuentra LA pieza

Responde por escrito, en una frase: **¿qué paso produjo el fallo y por qué?** Suele ser una de estas:
- **Faltaba contexto.** El paso no tenía la información que necesitaba: arregla `cerebro/contexto.md`.
- **Instrucciones ambiguas.** Arregla el fichero del paso en `pasos/`.
- **El revisor no lo vio.** Falta un criterio en la rúbrica de `cerebro/que-es-bien.md`.
- **Lo podía hacer código.** Convierte ese trozo del paso de agente en un script.
- **La comprobación no comprueba.** Endurécela para que pare la cadena (`pasos/04-verificar.py`).

## 3. Arregla solo esa pieza

No toques lo que funciona. Un commit con el arreglo y un mensaje que diga qué falló.

## 4. Apunta la lección

Añade una entrada arriba del todo de `cerebro/lecciones.md`, con su formato: qué pasó, la regla y cómo se comprueba.

## 5. Compruébalo

Vuelve a pasar por la fábrica el mismo issue que falló. Si ahora sale bien, compara `obs.py resumen` dentro de unas cuantas ejecuciones para confirmar que no vuelve.

## Señales de que hay que mejorar aunque nada haya «fallado»

- **Un paso reintenta mucho:** sus instrucciones o su contexto son flojos.
- **El paso 06 devuelve dos veces por el mismo criterio:** ese criterio falta en `que-es-bien.md`, no en el implementador.
- **Un paso tarda mucho más que el resto:** divídelo o pásalo a código.
- **Se repiten las mismas notas de tipo «decision»:** esa decisión debería estar escrita en el cerebro.
- **Siempre retocas a mano el cuerpo de la PR en el mismo sitio:** falta un criterio en `que-es-bien.md` o en `pasos/07-preparar-pr.py`.
