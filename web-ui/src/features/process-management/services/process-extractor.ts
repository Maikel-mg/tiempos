/**
 * ProcessExtractorService - Extract processes from time entries
 * 
 * Takes raw time entries and extracts unique processes with aggregated data.
 */

import { parseISO8601DurationToMinutes } from '@/lib/sql-utils';
import type { Process, TimeEntry } from '../types';

export class ProcessExtractorService {
  /**
   * Extract unique processes from time entries
   * Aggregates entries by task name, computing date ranges and total minutes
   */
  extractFromEntries(entries: TimeEntry[]): Process[] {
    const processMap: Record<string, Process> = {};

    entries.forEach(entry => {
      const taskName = entry.taskName || entry.task?.name;
      if (!taskName) return;

      if (!processMap[taskName]) {
        processMap[taskName] = {
          name: taskName,
          fechaInicio: entry.timeInterval?.start || '',
          fechaFin: entry.timeInterval?.end || '',
          totalMinutes: 0
        };
      }

      const process = processMap[taskName];
      const duration = entry.timeInterval?.duration;

      // Aggregate duration
      if (typeof duration === 'number') {
        process.totalMinutes += duration / 60;
      } else if (typeof duration === 'string') {
        process.totalMinutes += parseISO8601DurationToMinutes(duration);
      }

      // Update date range
      const entryStart = entry.timeInterval?.start;
      const entryEnd = entry.timeInterval?.end;

      if (entryStart && new Date(entryStart) < new Date(process.fechaInicio)) {
        process.fechaInicio = entryStart;
      }
      if (entryEnd && new Date(entryEnd) > new Date(process.fechaFin)) {
        process.fechaFin = entryEnd;
      }
    });

    // Sort by name
    return Object.values(processMap).sort((a, b) => a.name.localeCompare(b.name));
  }
}

// Singleton instance
export const processExtractor = new ProcessExtractorService();
