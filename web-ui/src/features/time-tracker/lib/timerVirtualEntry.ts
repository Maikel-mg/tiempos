import type { TimerState, TimeEntry } from '../types';

type VirtualTimerEntry = Pick<TimeEntry, 'taskId' | 'taskName' | 'date' | 'startTime' | 'endTime' | 'duration' | 'description'>;

function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatDateSV(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

export function createVirtualTimerEntry(timerState: TimerState, now: Date): VirtualTimerEntry {
  return {
    taskId: timerState.taskId,
    taskName: timerState.taskName,
    date: formatDateSV(now),
    startTime: formatTime(new Date(timerState.startTime)),
    endTime: formatTime(now),
    duration: timerState.elapsed,
    description: timerState.description,
  };
}
