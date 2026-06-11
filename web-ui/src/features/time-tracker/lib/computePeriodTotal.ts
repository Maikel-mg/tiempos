import type { TimeEntry } from '../types';

export function computePeriodTotal(
  entries: TimeEntry[],
  timerElapsed: number,
  todayInRange: boolean
): number {
  const entriesTotal = entries
    .filter((e) => !e.recoverable)
    .reduce((sum, e) => sum + e.duration, 0);
  return entriesTotal + (todayInRange ? timerElapsed : 0);
}
