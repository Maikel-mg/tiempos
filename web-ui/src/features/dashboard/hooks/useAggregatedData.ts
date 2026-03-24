import { useMemo } from 'react';
import type { TimeEntry } from '@/lib/types';
import type { DashboardSummary, TaskSummary } from '../types';

function parseISO8601Duration(durationString: string | number | undefined | null): number {
  if (!durationString) return 0;
  if (typeof durationString === 'number') return durationString;
  
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const match = String(durationString).match(regex);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}

function getWorkingDaysInRange(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return Math.max(count, 1);
}

export function useAggregatedData(entries: TimeEntry[], startDate: Date, endDate: Date): DashboardSummary {
  return useMemo(() => {
    if (!entries || entries.length === 0) {
      return {
        totalSeconds: 0,
        entriesCount: 0,
        avgPerDaySeconds: 0,
        tasksBreakdown: []
      };
    }

    let totalSeconds = 0;
    const taskMap = new Map<string, number>();

    for (const entry of entries) {
      const seconds = parseISO8601Duration(entry.timeInterval?.duration);
      totalSeconds += seconds;
      
      const taskName = entry.task?.name || entry.taskName || 'Sin tarea';
      const currentSeconds = taskMap.get(taskName) || 0;
      taskMap.set(taskName, currentSeconds + seconds);
    }

    const tasksBreakdown: TaskSummary[] = Array.from(taskMap.entries())
      .map(([name, seconds]) => ({
        name,
        seconds,
        percentage: totalSeconds > 0 ? Math.round((seconds / totalSeconds) * 1000) / 10 : 0
      }))
      .sort((a, b) => b.seconds - a.seconds);

    const workingDays = getWorkingDaysInRange(startDate, endDate);
    const avgPerDaySeconds = totalSeconds / workingDays;

    return {
      totalSeconds,
      entriesCount: entries.length,
      avgPerDaySeconds,
      tasksBreakdown
    };
  }, [entries, startDate, endDate]);
}
