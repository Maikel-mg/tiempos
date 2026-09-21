import type { TimeEntry } from '../types';

/** Minutos que tiene un día: un registro no puede terminar después. */
const MINUTES_PER_DAY = 24 * 60;

/** Un par de registros del mismo día cuyos horarios se solapan. */
export interface OverlapPair {
  /** El registro que empieza primero. */
  earlier: TimeEntry;
  /** El registro que empieza después (o al mismo tiempo). */
  later: TimeEntry;
}

export type OverlapFixKind =
  /** Acortar el registro anterior hasta donde empieza el posterior. */
  | 'shorten-previous'
  /** Correr el registro posterior para que arranque al terminar el anterior. */
  | 'move-after';

/** Corrección sugerida sobre un registro. El servicio recalcula `duration`. */
export interface OverlapFix {
  kind: OverlapFixKind;
  /** Id del registro a modificar. */
  entryId: string;
  /** Horarios a escribir (`HH:MM`). */
  patch: { startTime?: string; endTime?: string };
  /** Texto del botón. */
  label: string;
}

/**
 * Convierte `HH:MM` (o `HH:MM:SS`) a minutos desde medianoche.
 */
function hhmmToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToHHMM(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

/**
 * Encuentra los pares de registros que se solapan dentro de un mismo día.
 * Dos registros que sólo se tocan (uno termina donde empieza el otro) no
 * cuentan como solapamiento.
 */
export function findOverlaps(entries: TimeEntry[]): OverlapPair[] {
  const byDate = new Map<string, TimeEntry[]>();

  for (const entry of entries) {
    const day = byDate.get(entry.date);
    if (day) {
      day.push(entry);
    } else {
      byDate.set(entry.date, [entry]);
    }
  }

  const pairs: OverlapPair[] = [];

  for (const dayEntries of byDate.values()) {
    const sorted = [...dayEntries].sort(
      (a, b) => hhmmToMinutes(a.startTime) - hhmmToMinutes(b.startTime)
    );

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const earlier = sorted[i];
        const later = sorted[j];

        const startsInside =
          hhmmToMinutes(earlier.startTime) < hhmmToMinutes(later.endTime) &&
          hhmmToMinutes(later.startTime) < hhmmToMinutes(earlier.endTime);

        if (startsInside) {
          pairs.push({ earlier, later });
        }
      }
    }
  }

  return pairs;
}

/**
 * Propone las correcciones rápidas para un solapamiento.
 *
 * Sólo devuelve las correcciones que dejan los dos registros con duración
 * positiva y dentro del día. En particular, sobre un duplicado exacto no
 * ofrece "acortar el anterior" (partiría el registro a 0 minutos) y sí
 * "correr el posterior", que es la corrección que conserva lo trabajado.
 */
export function buildOverlapFixes(pair: OverlapPair): OverlapFix[] {
  const { earlier, later } = pair;
  const earlierStart = hhmmToMinutes(earlier.startTime);
  const earlierEnd = hhmmToMinutes(earlier.endTime);
  const laterStart = hhmmToMinutes(later.startTime);
  const laterEnd = hhmmToMinutes(later.endTime);

  const fixes: OverlapFix[] = [];

  if (laterStart > earlierStart) {
    fixes.push({
      kind: 'shorten-previous',
      entryId: earlier.id,
      patch: { endTime: minutesToHHMM(laterStart) },
      label: `Terminar a las ${minutesToHHMM(laterStart)}`,
    });
  }

  const laterDuration = laterEnd - laterStart;
  const shiftedEnd = earlierEnd + laterDuration;

  if (laterDuration > 0 && shiftedEnd < MINUTES_PER_DAY) {
    fixes.push({
      kind: 'move-after',
      entryId: later.id,
      patch: {
        startTime: minutesToHHMM(earlierEnd),
        endTime: minutesToHHMM(shiftedEnd),
      },
      label: `Mover a ${minutesToHHMM(earlierEnd)}-${minutesToHHMM(shiftedEnd)}`,
    });
  }

  return fixes;
}
