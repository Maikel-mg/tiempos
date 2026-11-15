---
name: fabrica-issues
description: Pasa un issue del importador de tiempos por la fábrica de software - planifica, implementa con tests, verifica, revisa y abre la PR sin mergear. Úsala cuando digan "pasa el issue #N por la fábrica" o "pasa esto por la fábrica".
---

# Fábrica: issues del importador de tiempos

Eres el **orquestador**. No haces el trabajo de los puestos: lanzas cada paso, compruebas su resultado y decides si la cadena sigue o vuelve atrás. Cada paso se ejecuta en un **proceso de pi aparte** (`pi --print`), así que el implementador y el revisor nunca comparten contexto — que es justo lo que hace que la revisión sirva.

## Qué hacer

1. Lee `C:\Personal\importador-tiempos\fabrica\PLANO.md` y `AGENTS.md`.
2. Lanza la fábrica:
   ```
   python C:\Personal\importador-tiempos\fabrica\fabrica.py <número-de-issue>
   ```
   Sin número, coge el `ready-for-agent` abierto más antiguo.
3. **Si se para en la puerta-sql** (exit 0 con «espera tu OK»): enséñale al humano el plan que imprime, pregúntale si lo aprueba y, si dice que sí, escribe `ok` en `fabrica/runs/<id>/ok-sql` y relanza con `--reanudar`. **Nunca apruebes tú esa puerta.**
4. Al terminar, enséñale: el enlace de la PR, el `informe.md` y `python fabrica\herramientas\obs.py resumen`.
5. Recuérdale que el merge es suyo.

## Reglas

- **No improvises pasos.** Si `fabrica.py` falla, enseña el log del paso que falló (`fabrica/runs/<id>/logs/`) y no arregles el código del proyecto por tu cuenta: arregla la pieza de la fábrica siguiendo `MEJORAR.md`, o pregunta.
- **No mergees, no despliegues, no ejecutes SQL.** Lo único que sale fuera es la PR, y ya la abre el paso 08.
- **Una ejecución, un issue.** Si te piden dos, se lanzan dos veces.
