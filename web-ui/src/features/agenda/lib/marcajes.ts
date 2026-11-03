import { formatDurationShort, parseHHMM } from '@/lib/format';

/** Un marcaje de la intranet: cuándo fichó el usuario. */
export interface Marcaje {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  origen: string;
}

/** Los marcajes de un día, con lo que cubren de jornada. */
export interface DayMarcajes {
  day: string;
  times: string[];
  /** Minutos entre pares entrada→salida consecutivos. */
  coveredMinutes: number;
}

/**
 * Agrupa los marcajes por día, ordenados. Lo cubierto es la suma de los pares
 * entrada→salida consecutivos: un marcaje impar (sin salida fichada) no suma,
 * porque no se sabe cuánto duró.
 */
export function groupMarcajesByDay(marcajes: Marcaje[]): DayMarcajes[] {
  const byDay = new Map<string, string[]>();
  for (const marcaje of marcajes) {
    const times = byDay.get(marcaje.date) ?? [];
    times.push(marcaje.time);
    byDay.set(marcaje.date, times);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, times]) => {
      const sorted = [...times].sort();
      let coveredMinutes = 0;
      for (let i = 0; i + 1 < sorted.length; i += 2) {
        coveredMinutes += parseHHMM(sorted[i + 1]) - parseHHMM(sorted[i]);
      }
      return { day, times: sorted, coveredMinutes };
    });
}

/** Diferencia marcada − registrada, en texto: `cuadra`, `+45m`, `−1h 20m`. */
export function formatMarcajesDelta(seconds: number): string {
  if (seconds === 0) return 'cuadra';
  return `${seconds > 0 ? '+' : '−'}${formatDurationShort(Math.abs(seconds))}`;
}
