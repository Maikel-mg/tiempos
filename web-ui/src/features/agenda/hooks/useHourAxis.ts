import { useMemo } from 'react';
import { hourBounds } from '../lib/planRange';
import type { TimeEntry } from '@/features/time-tracker/types';

export interface HourAxis {
  /** Primer minuto dibujado. */
  from: number;
  /** Último minuto dibujado. */
  to: number;
  span: number;
  /** Horas enteras a marcar en el eje. */
  hours: number[];
  /** Posición horizontal de un minuto, en porcentaje del ancho. */
  pct: (minutes: number) => number;
  /** Posición vertical de un minuto, en píxeles, con el alto de hora dado. */
  topOf: (minutes: number, hourPx: number) => number;
}

/**
 * Geometría del eje horario del plan, compartida por Calendario y Timeline para
 * que un cambio en la banda horaria no se haga en dos sitios.
 */
export function useHourAxis(entries: TimeEntry[], workdayStart: number | null): HourAxis {
  return useMemo(() => {
    const { from, to } = hourBounds(entries, workdayStart);
    const span = Math.max(1, to - from);
    return {
      from,
      to,
      span,
      hours: Array.from({ length: Math.round(span / 60) }, (_, index) => from / 60 + index),
      pct: (minutes: number) => ((minutes - from) / span) * 100,
      topOf: (minutes: number, hourPx: number) => ((minutes - from) / 60) * hourPx,
    };
  }, [entries, workdayStart]);
}
