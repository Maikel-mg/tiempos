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

  /**
   * Escribe varias entradas de una vez y de forma atómica: o se escriben todas o
   * no se escribe ninguna. Lo necesita "Dividir", que recorta una mitad y crea la
   * otra: un fallo a medias perdería tiempo del usuario.
   */
  saveEntries(entries: TimeEntry[]): Promise<void>;

  // Timer State
  saveTimerState(state: TimerState): Promise<void>;
  getTimerState(): Promise<TimerState | null>;
  clearTimerState(): Promise<void>;
}