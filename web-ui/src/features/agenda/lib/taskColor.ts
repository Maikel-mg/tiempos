/**
 * Color estable por Tarea (Proceso), derivado de su nombre.
 *
 * Las tres vistas de la Agenda lo comparten para que la misma Tarea se reconozca
 * de un vistazo en cualquiera de ellas.
 */
const PALETTE = [
  {
    block: 'border-sky-500/50 bg-sky-500/15',
    accent: 'border-sky-500',
    bar: 'bg-sky-500',
    text: 'text-sky-700 dark:text-sky-300',
  },
  {
    block: 'border-violet-500/50 bg-violet-500/15',
    accent: 'border-violet-500',
    bar: 'bg-violet-500',
    text: 'text-violet-700 dark:text-violet-300',
  },
  {
    block: 'border-emerald-500/50 bg-emerald-500/15',
    accent: 'border-emerald-500',
    bar: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    block: 'border-amber-500/50 bg-amber-500/15',
    accent: 'border-amber-500',
    bar: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
  },
  {
    block: 'border-rose-500/50 bg-rose-500/15',
    accent: 'border-rose-500',
    bar: 'bg-rose-500',
    text: 'text-rose-700 dark:text-rose-300',
  },
  {
    block: 'border-cyan-500/50 bg-cyan-500/15',
    accent: 'border-cyan-500',
    bar: 'bg-cyan-500',
    text: 'text-cyan-700 dark:text-cyan-300',
  },
];

export function taskColor(taskName: string) {
  let hash = 0;
  for (let index = 0; index < taskName.length; index++) {
    hash = (hash * 31 + taskName.charCodeAt(index)) % 100003;
  }
  return PALETTE[hash % PALETTE.length];
}
