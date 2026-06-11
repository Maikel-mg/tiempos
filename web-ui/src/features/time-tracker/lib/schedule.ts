/**
 * Configuración de horario laboral.
 * Resuelve el target de horas diarias para cualquier fecha.
 */

interface DaySchedule {
  [key: string]: number;
}

interface ScheduleException {
  start: string;  // YYYY-MM-DD
  end: string;    // YYYY-MM-DD
  dailyHours: number;
}

interface Schedule {
  default: DaySchedule;
  exceptions: ScheduleException[];
}

const SCHEDULE: Schedule = {
  default: {
    mon: 8.25,
    tue: 8.25,
    wed: 8.25,
    thu: 8.25,
    fri: 7,
    sat: 0,
    sun: 0,
  },
  exceptions: [
    { start: '2025-07-01', end: '2025-09-15', dailyHours: 7 },
  ],
};

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

/**
 * Resuelve el target de horas para una fecha dada.
 * Primero verifica excepciones por rango de fechas, luego cae al horario semanal default.
 */
export function getDailyTarget(date: string): number {
  // Check exceptions first
  for (const exception of SCHEDULE.exceptions) {
    if (date >= exception.start && date <= exception.end) {
      return exception.dailyHours;
    }
  }

  // Fall back to default weekly schedule
  const dayOfWeek = new Date(date + 'T12:00:00').getDay();
  const dayName = DAY_NAMES[dayOfWeek];
  return SCHEDULE.default[dayName];
}
