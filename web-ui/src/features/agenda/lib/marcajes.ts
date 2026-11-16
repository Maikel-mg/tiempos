import { formatDurationShort, parseHHMM } from '@/lib/format';

/** Un marcaje de la intranet: cuándo fichó el usuario. */
export interface Marcaje {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  origen: string;
  /** Marcaje que el usuario añadió a mano porque la intranet no lo registró. */
  manual?: boolean;
}

/** Clave de upsert de un Marcaje: fecha + hora + origen. */
export function marcajeKey(marcaje: Pick<Marcaje, 'date' | 'time' | 'origen'>): string {
  return `${marcaje.date}|${marcaje.time}|${marcaje.origen}`;
}

/** Los marcajes de un día, con lo que cubren de jornada. */
export interface DayMarcajes {
  day: string;
  times: string[];
  /** Minutos entre pares entrada→salida consecutivos. */
  coveredMinutes: number;
  /** Los Marcajes del día, ordenados por hora. */
  marcajes: Marcaje[];
}

/**
 * Agrupa los marcajes por día, ordenados. Lo cubierto es la suma de los pares
 * entrada→salida consecutivos: un marcaje impar (sin salida fichada) no suma,
 * porque no se sabe cuánto duró.
 */
export function groupMarcajesByDay(marcajes: Marcaje[]): DayMarcajes[] {
  const byDay = new Map<string, Marcaje[]>();
  for (const marcaje of marcajes) {
    const day = byDay.get(marcaje.date) ?? [];
    day.push(marcaje);
    byDay.set(marcaje.date, day);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, dayMarcajes]) => {
      const sorted = [...dayMarcajes].sort(
        (a, b) => a.time.localeCompare(b.time) || a.origen.localeCompare(b.origen),
      );
      const times = sorted.map((marcaje) => marcaje.time);
      let coveredMinutes = 0;
      for (let i = 0; i + 1 < times.length; i += 2) {
        coveredMinutes += parseHHMM(times[i + 1]) - parseHHMM(times[i]);
      }
      return { day, times, coveredMinutes, marcajes: sorted };
    });
}

/** Diferencia marcada − registrada, en texto: `cuadra`, `+45m`, `−1h 20m`. */
export function formatMarcajesDelta(seconds: number): string {
  if (seconds === 0) return 'cuadra';
  return `${seconds > 0 ? '+' : '−'}${formatDurationShort(Math.abs(seconds))}`;
}
