import { parseHHMM } from '@/lib/format';
import { formatDateToString, getWeekNumber, getWeekStart, parseDateString } from '@/features/time-tracker/lib/groupEntriesByWeek';
import type { TimeEntry } from '@/features/time-tracker/types';

/**
 * Rango y geometría del plan diario/semanal.
 *
 * Módulo puro: sin React ni almacenamiento. Es la fuente única de verdad de las
 * tres vistas de la Agenda y de su paginador. Los días no laborables (sábado y
 * domingo) no existen en el plan.
 */

export type PlanMode = 'day' | 'week';

/** Duración por defecto de un Registro de tiempo creado desde un hueco. */
export const DEFAULT_ENTRY_MINUTES = 30;

const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function todayKey(): string {
  return formatDateToString(new Date());
}

export function addDays(key: string, days: number): string {
  const date = parseDateString(key);
  date.setDate(date.getDate() + days);
  return formatDateToString(date);
}

export function isWeekend(key: string): boolean {
  const day = parseDateString(key).getDay();
  return day === 0 || day === 6;
}

/** Día laborable del plan: sábado y domingo se resuelven al viernes anterior. */
export function toWorkday(key: string): string {
  let day = key;
  for (let guard = 0; guard < 7 && isWeekend(day); guard++) day = addDays(day, -1);
  return day;
}

/** Día laborable anterior o siguiente, saltando el fin de semana. */
export function nextWorkday(key: string, step: 1 | -1): string {
  let day = addDays(key, step);
  for (let guard = 0; guard < 7 && isWeekend(day); guard++) day = addDays(day, step);
  return day;
}

/** Días de la semana que muestra el plan: lunes a viernes. */
export function weekDayKeys(cursor: string): string[] {
  const monday = getWeekStart(parseDateString(cursor));
  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return formatDateToString(date);
  });
}

/** Días visibles según el modo: el día del cursor o los cinco laborables. */
export function visibleDays(mode: PlanMode, cursor: string): string[] {
  return mode === 'week' ? weekDayKeys(cursor) : [cursor];
}

export function formatDayLong(key: string): string {
  const date = parseDateString(key);
  return `${DAY_NAMES[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDayShort(key: string): string {
  const date = parseDateString(key);
  return `${DAY_SHORT[date.getDay()]} ${date.getDate()}`;
}

export function formatWeekLabel(cursor: string): string {
  const days = weekDayKeys(cursor);
  const first = parseDateString(days[0]);
  const last = parseDateString(days[days.length - 1]);
  const range =
    first.getMonth() === last.getMonth()
      ? `${first.getDate()} – ${last.getDate()} ${MONTHS[last.getMonth()]}`
      : `${first.getDate()} ${MONTHS[first.getMonth()]} – ${last.getDate()} ${MONTHS[last.getMonth()]}`;
  return `${range} · semana ${getWeekNumber(parseDateString(days[3]))}`;
}

export function entriesOfDays(entries: TimeEntry[], days: string[]): TimeEntry[] {
  return entries.filter((entry) => days.includes(entry.date));
}

export function sortByStart(entries: TimeEntry[]): TimeEntry[] {
  return [...entries].sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function totalSeconds(entries: TimeEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.duration, 0);
}

/**
 * Banda horaria a dibujar. Arranca en la Hora de entrada configurada (`desde`
 * en minutos) para que el día entre de un vistazo, se estira hasta el Registro
 * de tiempo más temprano si alguno empieza antes —nunca se oculta información—
 * y sin configuración mantiene una hora de margen.
 */
export function hourBounds(
  entries: TimeEntry[],
  workdayStartMinutes?: number | null,
): { from: number; to: number } {
  const configured =
    workdayStartMinutes != null && Number.isFinite(workdayStartMinutes) ? workdayStartMinutes : null;

  if (entries.length === 0) {
    const from = configured ?? 8 * 60;
    return { from, to: Math.min(24 * 60, from + 8 * 60) };
  }

  let earliest = Infinity;
  let latest = -Infinity;
  for (const entry of entries) {
    earliest = Math.min(earliest, parseHHMM(entry.startTime));
    latest = Math.max(latest, parseHHMM(entry.endTime));
  }

  const firstHour = Math.floor(earliest / 60) * 60;
  const from = Math.max(0, Math.min(configured ?? firstHour - 60, firstHour));
  const to = Math.min(24 * 60, Math.ceil(latest / 60) * 60 + 60);
  return { from, to: Math.max(to, from + 4 * 60) };
}

export function minutesToHHMM(minutes: number): string {
  const clamped = Math.min(23 * 60 + 45, Math.max(0, minutes));
  const hours = Math.floor(clamped / 60);
  return `${String(hours).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
}

export function addMinutesToTime(time: string, delta: number): string {
  return minutesToHHMM(parseHHMM(time) + delta);
}

/** Hora de fin del último Registro de tiempo del día, o el inicio de jornada. */
export function endOfDay(entries: TimeEntry[], fallback = '09:00'): string {
  const sorted = sortByStart(entries);
  return sorted.length > 0 ? sorted[sorted.length - 1].endTime : fallback;
}

/** Minutos sin registrar entre un Registro de tiempo y el anterior del mismo día. */
export function gapsOf(entries: TimeEntry[]): Map<string, number> {
  const gaps = new Map<string, number>();
  const sorted = sortByStart(entries);
  for (let index = 1; index < sorted.length; index++) {
    const gap = parseHHMM(sorted[index].startTime) - parseHHMM(sorted[index - 1].endTime);
    if (gap > 0) gaps.set(sorted[index].id, gap);
  }
  return gaps;
}

export interface TaskLane {
  taskName: string;
  taskId: number;
  total: number;
  byDay: Map<string, TimeEntry[]>;
}

/** Agrupa por Tarea, de mayor a menor tiempo, para la vista Calendario. */
export function taskLanes(entries: TimeEntry[]): TaskLane[] {
  const lanes = new Map<string, TaskLane>();
  for (const entry of entries) {
    let lane = lanes.get(entry.taskName);
    if (!lane) {
      lane = { taskName: entry.taskName, taskId: entry.taskId, total: 0, byDay: new Map() };
      lanes.set(entry.taskName, lane);
    }
    lane.total += entry.duration;
    const day = lane.byDay.get(entry.date) ?? [];
    day.push(entry);
    lane.byDay.set(entry.date, day);
  }
  return [...lanes.values()].sort((a, b) => b.total - a.total);
}
