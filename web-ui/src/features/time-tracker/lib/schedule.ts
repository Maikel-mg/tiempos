/**
 * Configuración de horario laboral.
 * Resuelve el target de horas diarias para cualquier fecha.
 * Lee la configuración desde scheduleConfig (config store).
 */

import { scheduleConfig } from '@/config/stores';

interface ScheduleException {
  start: string;  // YYYY-MM-DD
  end: string;    // YYYY-MM-DD
  dailyHours: number;
}

interface ScheduleConfig {
  defaultHours: Record<string, number>;
  exceptions: ScheduleException[];
}

const DEFAULT_HOURS: Record<string, number> = {
  mon: 8.25,
  tue: 8.25,
  wed: 8.25,
  thu: 8.25,
  fri: 7,
  sat: 0,
  sun: 0,
};

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function resolveSchedule(): ScheduleConfig {
  const config = scheduleConfig.get();
  return {
    defaultHours: config?.defaultHours ?? DEFAULT_HOURS,
    exceptions: config?.exceptions ?? [],
  };
}

/**
 * Resuelve el target de horas para una fecha dada.
 * Primero verifica excepciones por rango de fechas, luego cae al horario semanal default.
 */
export function getDailyTarget(date: string): number {
  const schedule = resolveSchedule();

  // Resolve default for this day
  const dayOfWeek = new Date(date + 'T12:00:00').getDay();
  const dayName = DAY_NAMES[dayOfWeek];
  const defaultHours = schedule.defaultHours[dayName] ?? 0;

  // If default is 0 (weekend/holiday), always return 0 — exceptions don't override off days
  if (defaultHours === 0) return 0;

  // Check exceptions — only apply to working days
  for (const exception of schedule.exceptions) {
    if (date >= exception.start && date <= exception.end) {
      return exception.dailyHours;
    }
  }

  return defaultHours;
}
