import { useQuery } from '@tanstack/react-query';
import { indexedDBStorage } from '@/lib/storage/IndexedDBStorage';
import type { TimeEntry as TrackerTimeEntry } from '@/features/time-tracker/types';
import type { TimeEntry } from '@/lib/types';

export interface UseTimeEntriesParams {
  startDate: string;
  endDate: string;
}

export interface DashboardTimeEntriesResponse {
  success: boolean;
  count: number;
  data: TimeEntry[];
  error?: string;
}

function toDashboardEntry(entry: TrackerTimeEntry): TimeEntry {
  return {
    id: entry.id,
    description: entry.description ?? '',
    taskName: entry.taskName,
    task: { name: entry.taskName },
    project: { name: entry.proceso?.proyectoNombre ?? '' },
    projectId: entry.proceso?.proyectoId != null ? String(entry.proceso.proyectoId) : undefined,
    timeInterval: {
      start: `${entry.date}T${entry.startTime}`,
      end: `${entry.date}T${entry.endTime}`,
      duration: entry.duration
    }
  };
}

export function useTimeEntries(params: UseTimeEntriesParams) {
  return useQuery<DashboardTimeEntriesResponse, Error>({
    queryKey: ['local-time-entries', params.startDate, params.endDate],
    queryFn: async () => {
      const entries = await indexedDBStorage.getEntriesByDateRange(params.startDate, params.endDate);
      const worked = entries.filter((entry) => !entry.recoverable);
      return {
        success: true,
        count: worked.length,
        data: worked.map(toDashboardEntry)
      };
    },
    // Datos locales (IndexedDB): releerlos es barato. Con staleTime 0, el
    // Dashboard se refresca al montar y al volver a la pestaña, sin depender
    // de invalidaciones cruzadas desde el tracker.
    staleTime: 0,
    retry: 1
  });
}
