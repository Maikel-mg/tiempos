import Dexie, { type Table } from 'dexie';
import type { StorageStrategy } from './StorageStrategy';
import type { TimeEntry, TimerState } from '../../features/time-tracker/types';

/**
 * Base de datos IndexedDB para el TimeTracker usando Dexie.
 */
class TimeTrackerDB extends Dexie {
  timeEntries!: Table<TimeEntry, string>;
  timerState!: Table<TimerState, string>;

  constructor() {
    super('TimeTrackerDB');
    this.version(1).stores({
      timeEntries: 'id, taskId, date, startTime, endTime, synced, createdAt',
      timerState: 'id'
    });
  }
}

const db = new TimeTrackerDB();

/**
 * Implementación de StorageStrategy usando IndexedDB (Dexie).
 */
export class IndexedDBStorage implements StorageStrategy {
  // TimeEntries
  async saveEntry(entry: TimeEntry): Promise<void> {
    await db.timeEntries.add(entry);
  }

  async getEntry(id: string): Promise<TimeEntry | null> {
    return await db.timeEntries.get(id) || null;
  }

  async getAllEntries(): Promise<TimeEntry[]> {
    return await db.timeEntries.toArray();
  }

  async getEntriesByDateRange(startDate: string, endDate: string): Promise<TimeEntry[]> {
    return await db.timeEntries
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
  }

  async updateEntry(entry: TimeEntry): Promise<void> {
    await db.timeEntries.put(entry);
  }

  async deleteEntry(id: string): Promise<void> {
    await db.timeEntries.delete(id);
  }

  async markAsSynced(ids: string[], syncedAt: string): Promise<void> {
    await db.timeEntries.bulkUpdate(
      ids.map(id => ({
        key: id,
        changes: { synced: true, syncedAt }
      }))
    );
  }

  // Timer State
  async saveTimerState(state: TimerState): Promise<void> {
    await db.timerState.put(state, 'current');
  }

  async getTimerState(): Promise<TimerState | null> {
    return await db.timerState.get('current') || null;
  }

  async clearTimerState(): Promise<void> {
    await db.timerState.delete('current');
  }
}

// Exportar instancia singleton
export const indexedDBStorage = new IndexedDBStorage();