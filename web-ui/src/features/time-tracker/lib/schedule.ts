/**
 * Configuración de horario laboral.
 * Resuelve el target de horas diarias para cualquier fecha.
 * Lee la configuración desde scheduleConfig (config store).
 */

import { scheduleConfig } from '@/config/stores';
import { parseHHMM } from '@/lib/format';

interface ScheduleException {
  start: string;  // YYYY-MM-DD
  end: string;    // YYYY-MM-DD
  dailyHours: number;
}

interface ScheduleConfig {
  defaultHours: Record<string, number>;
  startTime: string;  // HH:MM
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

const DEFAULT_START_TIME = '09:00';

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function resolveSchedule(): ScheduleConfig {
  const config = scheduleConfig.get();
  return {
    defaultHours: config?.defaultHours ?? DEFAULT_HOURS,
    startTime: config?.startTime ?? DEFAULT_START_TIME,
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

/**
 * Hora de entrada de la jornada, en minutos desde medianoche.
 *
 * Devuelve `null` cuando la fecha no es un día laborable (objetivo 0: fin de
 * semana o excepción de horario), porque en ese caso no hay jornada que
 * empezar.
 */
export function getWorkdayStart(date: string): number | null {
  if (getDailyTarget(date) === 0) return null;
  const minutes = parseHHMM(resolveSchedule().startTime);
  // Una hora de entrada vacía o mal formada desactiva el aviso en vez de
  // propagar un NaN que lo dejaría mudo sin explicación.
  return Number.isFinite(minutes) ? minutes : null;
}
