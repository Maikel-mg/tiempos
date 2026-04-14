import type { TimeEntry, TimerState } from '../../features/time-tracker/types';

/**
 * Interfaz abstracta para el almacenamiento de datos del TimeTracker.
 * Permite cambiar la implementación (IndexedDB, API remota, etc.) sin modificar la lógica de negocio.
 */
export interface StorageStrategy {
  // TimeEntries
  saveEntry(entry: TimeEntry): Promise<void>;
  getEntry(id: string): Promise<TimeEntry | null>;
  getAllEntries(): Promise<TimeEntry[]>;
  getEntriesByDateRange(startDate: string, endDate: string): Promise<TimeEntry[]>;
  updateEntry(entry: TimeEntry): Promise<void>;
  deleteEntry(id: string): Promise<void>;
  markAsSynced(ids: string[], syncedAt: string): Promise<void>;

  // Timer State
  saveTimerState(state: TimerState): Promise<void>;
  getTimerState(): Promise<TimerState | null>;
  clearTimerState(): Promise<void>;
}