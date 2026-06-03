import { apiClient } from '@/lib/api/client';
import type { DbConfig } from '@/lib/types';
import type { TimeEntry } from '../types';

export interface SyncResultEntry {
  entryId: string;
  success: boolean;
  serverId?: number;
  error?: string;
}

export interface SyncOutcome {
  success: boolean;
  results: SyncResultEntry[];
}

/**
 * Syncs local time entries to the SQL Server database via /api/execute-time-entries.
 * Never throws — returns a structured SyncOutcome on any failure.
 */
export async function syncTimeEntries(
  entries: TimeEntry[],
  dbConfig: DbConfig,
  usuario: string,
): Promise<SyncOutcome> {
  try {
    const payload = entries.map((entry) => {
      return {
      entryId: entry.id,
      Usured: usuario,
      Fecha: entry.date.replace(/-/g, ''),
      HoraDesde: entry.startTime.slice(0, 5),
      HoraHasta: entry.endTime.slice(0, 5),
      Minutos: entry.duration / 60,
      Proceso: entry.taskId,
      Comentario: entry.description,
      pTipoHora: 11,
    };
    });

    const result = await apiClient.post<{
      success: boolean;
      results: SyncResultEntry[];
    }>('/execute-time-entries', {
      ...dbConfig,
      entries: payload,
    });

    if (result.success) {
      return result.data;
    }

    return { success: false, results: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, results: [] };
  }
}
