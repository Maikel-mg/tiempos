import type { CSSProperties } from 'react';

/**
 * Color estable por Tarea (Proceso), derivado de su nombre.
 *
 * Las tres vistas de la Agenda lo comparten para que la misma Tarea se reconozca
 * de un vistazo en cualquiera de ellas.
 *
 * Doce tonos repartidos cada 30° por la rueda de color. El tono viaja en la variable
 * CSS `--task-hue`, así que las clases son literales (Tailwind las ve al compilar) y
 * el color se resuelve en tiempo de ejecución.
 */
const HUE_SLOTS = 12;
const HUE_STEP = 360 / HUE_SLOTS;

/** Multiplicador coprimo con 360: nombres parecidos ("Proceso A"/"Proceso B") caen lejos. */
const HUE_SPREAD = 137;

export function taskHue(taskName: string) {
  let hash = 0;
  for (let index = 0; index < taskName.length; index++) {
    hash = (hash * 31 + taskName.charCodeAt(index)) % 100003;
  }
  return (Math.round(((hash * HUE_SPREAD) % 360) / HUE_STEP) * HUE_STEP) % 360;
}

export function taskColor(taskName: string) {
  const hue = taskHue(taskName);

  return {
    /** Se aplica al mismo elemento que usa `block`, `accent`, `bar` o `text`. */
    style: { '--task-hue': String(hue) } as CSSProperties,
    block: 'border-[hsl(var(--task-hue)_65%_45%/0.6)] bg-[hsl(var(--task-hue)_70%_50%/0.22)]',
    accent: 'border-[hsl(var(--task-hue)_65%_45%)]',
    bar: 'bg-[hsl(var(--task-hue)_65%_38%)]',
    text: 'text-[hsl(var(--task-hue)_70%_32%)] dark:text-[hsl(var(--task-hue)_75%_70%)]',
  };
}
