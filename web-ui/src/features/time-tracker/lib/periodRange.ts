import type { PeriodType, DateRange } from '@/components/shared/PeriodSelector';

export interface ResolvedPeriodRange {
  start: Date;
  end: Date;
  /** Inclusive day bound, YYYY-MM-DD. */
  startStr: string;
  /** Inclusive day bound, YYYY-MM-DD. */
  endStr: string;
}

function toDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Resuelve el rango de días cubierto por un período del selector.
 * Fuente única de verdad para el filtrado de la lista y el balance.
 */
export function resolvePeriodRange(
  period: PeriodType,
  customRange?: DateRange,
  now: Date = new Date(),
): ResolvedPeriodRange {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let start: Date;
  let end: Date;

  switch (period) {
    case 'today':
      start = today;
      end = new Date(now);
      break;
    case 'week': {
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      start = new Date(today);
      start.setDate(today.getDate() - diffToMonday);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'last-month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    case 'custom':
      start = customRange?.start ?? today;
      end = customRange?.end ?? now;
      break;
    default:
      start = today;
      end = now;
  }

  return { start, end, startStr: toDateStr(start), endStr: toDateStr(end) };
}
