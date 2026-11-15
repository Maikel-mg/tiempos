/**
 * Cálculo de las cards Hoy / Semana / Mes del panel de progreso.
 * Función pura: el panel sólo compone. Sin efectos secundarios.
 */

import { computeDailyBalance, computeWeeklyBalance } from './balance';
import { getDailyTarget } from './schedule';
import { toLocalDateString } from './localDate';
import { formatHM, formatTargetHM, percentWidth } from './progressFormat';
import type { TimeEntry } from '../types';

export interface PeriodProgressSegment {
  /** Segundos trabajados: objetivo del período + balance + timer en marcha. */
  worked: number;
  target: number;
  remaining: number;
  subtext: string;
  /** Clase de acento; vacío = aún queda tiempo (ámbar). */
  accentClass: string;
  percent: number;
}

export interface PeriodProgress {
  hoy: PeriodProgressSegment;
  semana: PeriodProgressSegment;
  mes: PeriodProgressSegment;
}

export interface ComputePeriodProgressOptions {
  /** Fecha de hoy (YYYY-MM-DD); inyectable para tests. */
  today: string;
  /** Segundos transcurridos del timer en marcha (0 si no corre). */
  elapsed?: number;
}

const ACCENT_EMERALD = 'text-emerald-600 dark:text-emerald-400';

function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getWeekStartStr(today: string): string {
  const date = parseLocalDate(today);
  const dayOfWeek = date.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(date);
  monday.setDate(date.getDate() - diffToMonday);
  return toLocalDateString(monday);
}

function getDaysInMonth(today: string): number {
  const date = parseLocalDate(today);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/** Targets diarios del lunes a domingo de la semana de `today`. */
function weekTargetSec(weekStartStr: string): number {
  let total = 0;
  const monday = new Date(weekStartStr + 'T12:00:00');
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const target = getDailyTarget(toLocalDateString(day));
    if (target > 0) total += target * 3600;
  }
  return total;
}

function monthDates(today: string): string[] {
  const date = parseLocalDate(today);
  const days = getDaysInMonth(today);
  return Array.from({ length: days }, (_, i) =>
    toLocalDateString(new Date(date.getFullYear(), date.getMonth(), i + 1)),
  );
}

function makeSegment(
  worked: number,
  target: number,
  targetLabel: string,
): PeriodProgressSegment {
  const remaining = target - worked;
  let subtext: string;
  let accentClass = '';
  if (remaining > 0) {
    subtext = `${formatHM(remaining)} para llegar a ${targetLabel}`;
  } else if (remaining === 0) {
    subtext = '¡Objetivo cumplido!';
    accentClass = ACCENT_EMERALD;
  } else {
    subtext = `+${formatHM(Math.abs(remaining))} por encima`;
    accentClass = ACCENT_EMERALD;
  }
  return { worked, target, remaining, subtext, accentClass, percent: percentWidth(worked, target) };
}

export function computePeriodProgress(
  entries: TimeEntry[],
  { today, elapsed = 0 }: ComputePeriodProgressOptions,
): PeriodProgress {
  const todayTargetHours = getDailyTarget(today);
  const todayTargetSec = todayTargetHours * 3600;
  const workedToday = todayTargetSec + computeDailyBalance(entries, today) + elapsed;

  const weekStartStr = getWeekStartStr(today);
  const weekTarget = weekTargetSec(weekStartStr);
  const workedWeek = weekTarget + computeWeeklyBalance(entries, weekStartStr) + elapsed;

  const monthTarget = monthDates(today).reduce((total, dateStr) => {
    const target = getDailyTarget(dateStr);
    return target > 0 ? total + target * 3600 : total;
  }, 0);
  const monthlyBalance = monthDates(today).reduce(
    (total, dateStr) => total + computeDailyBalance(entries, dateStr),
    0,
  );
  const workedMonth = monthTarget + monthlyBalance + elapsed;

  return {
    hoy: makeSegment(workedToday, todayTargetSec, formatTargetHM(todayTargetHours)),
    semana: makeSegment(workedWeek, weekTarget, formatHM(weekTarget)),
    mes: makeSegment(workedMonth, monthTarget, formatHM(monthTarget)),
  };
}
