import type { TaskHourSummary, TaskHoursResult, TimeEntry } from '../types';

/**
 * Agrupa Registros de tiempo por taskId. Transformación pura: recibe las entradas
 * ya filtradas por quien la consume y no depende de React.
 */
export function computeTaskHours(entries: TimeEntry[]): TaskHoursResult {
  const byTaskId = new Map<number, TaskHourSummary>();

  for (const entry of entries) {
    const group = byTaskId.get(entry.taskId);
    if (group) {
      group.totalSeconds += entry.duration;
      group.entryCount += 1;
      group.entries.push(entry);
    } else {
      byTaskId.set(entry.taskId, {
        taskId: entry.taskId,
        taskName: entry.taskName,
        totalSeconds: entry.duration,
        entryCount: 1,
        entries: [entry],
      });
    }
  }

  const sorted = [...byTaskId.values()].sort(
    (a, b) => b.totalSeconds - a.totalSeconds || a.taskId - b.taskId
  );
  const grandTotalSeconds = sorted.reduce((sum, g) => sum + g.totalSeconds, 0);

  return { byTaskId, sorted, grandTotalSeconds };
}
