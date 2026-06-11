import Dexie, { type Table, type Transaction } from 'dexie';
import type { StorageStrategy } from './StorageStrategy';
import type { TimeEntry, TimerState, Proceso } from '../../features/time-tracker/types';

/**
 * Migración v1→v2: convierte taskId de string a number.
 * Elimina entradas con taskId inválido (no finite, <= 0, no integer).
 */
export async function migrateToV2(tx: Transaction): Promise<{ migrated: number; discarded: number }> {
  const table = tx.table<TimeEntry & { taskId: string | number }, string>('timeEntries');
  const entries = await table.toArray();
  let migrated = 0;
  let discarded = 0;

  for (const entry of entries) {
    if (typeof entry.taskId === 'number' && Number.isFinite(entry.taskId) && entry.taskId > 0 && Number.isInteger(entry.taskId)) {
      migrated++;
      continue;
    }

    if (typeof entry.taskId === 'string') {
      const parsed = parseInt(entry.taskId, 10);
      if (Number.isFinite(parsed) && parsed > 0 && Number.isInteger(parsed)) {
        await table.update(entry.id, {
          taskId: parsed,
          proceso: { proceso: parsed, nombre: entry.taskName } satisfies Proceso,
        } as Partial<TimeEntry>);
        migrated++;
      } else {
        await table.delete(entry.id);
        discarded++;
      }
    } else {
      await table.delete(entry.id);
      discarded++;
    }
  }

  return { migrated, discarded };
}

/**
 * Migración v2→v3: agrega campo recoverable a entradas existentes.
 * Entradas sin el campo quedan con recoverable: false.
 */
export async function migrateToV3(tx: Transaction): Promise<{ updated: number }> {
  const table = tx.table<TimeEntry, string>('timeEntries');
  const entries = await table.toArray();
  let updated = 0;

  for (const entry of entries) {
    if (entry.recoverable === undefined) {
      await table.update(entry.id, { recoverable: false } as Partial<TimeEntry>);
      updated++;
    }
  }

  return { updated };
}

/**
 * Base de datos IndexedDB para el TimeTracker usando Dexie.
 */
class TimeTrackerDB extends Dexie {
  timeEntries!: Table<TimeEntry, string>;
  timerState!: Table<TimerState, string>;
  processes!: Table<Proceso, number>;
  processRecents!: Table<{ proceso: number; lastUsedAt: number }, number>;
  migrationMeta!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super('TimeTrackerDB');

    this.version(1).stores({
      timeEntries: 'id, taskId, date, startTime, endTime, synced, createdAt',
      timerState: 'id',
    });

    this.version(2).stores({
      timeEntries: 'id, taskId, date, startTime, endTime, synced, createdAt, serverId',
      timerState: 'id',
      processes: 'proceso, nombre, faseNombre, proyectoNombre, clienteNombre',
      processRecents: 'proceso, lastUsedAt',
      migrationMeta: 'key',
    }).upgrade(async (tx) => {
      const result = await migrateToV2(tx);
      await tx.table('migrationMeta').put({ key: 'v2_migration', value: result });
      return result;
    });

    this.version(3).stores({
      timeEntries: 'id, taskId, date, startTime, endTime, synced, createdAt, serverId, recoverable',
      timerState: 'id',
      processes: 'proceso, nombre, faseNombre, proyectoNombre, clienteNombre',
      processRecents: 'proceso, lastUsedAt',
      migrationMeta: 'key',
    }).upgrade(async (tx) => {
      const result = await migrateToV3(tx);
      await tx.table('migrationMeta').put({ key: 'v3_migration', value: result });
      return result;
    });
  }
}

const db = new TimeTrackerDB();

export { db };

/**
 * Retorna el resultado de la migración v2, o null si nunca corrió.
 */
export async function getMigrationResult(): Promise<{ migrated: number; discarded: number } | null> {
  try {
    const row = await db.migrationMeta.get('v2_migration');
    if (!row || !row.value || typeof row.value !== 'object') return null;
    return row.value as { migrated: number; discarded: number };
  } catch {
    return null;
  }
}

/**
 * Verifica si la advertencia de migración ya fue mostrada.
 */
export async function wasMigrationWarningShown(): Promise<boolean> {
  try {
    const row = await db.migrationMeta.get('migrationV2Warned');
    return row?.value === true;
  } catch {
    return false;
  }
}

/**
 * Marca la advertencia de migración como mostrada.
 */
export async function markMigrationWarningShown(): Promise<void> {
  await db.migrationMeta.put({ key: 'migrationV2Warned', value: true });
}

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
  // Dexie schema defines timerState with keyPath 'id', but TimerState
  // doesn't have an id field. We inject id:'current' on write and
  // strip it on read so IndexedDB's keyPath evaluation succeeds.
  async saveTimerState(state: TimerState): Promise<void> {
    await db.timerState.put({ ...state, id: 'current' } as TimerState & { id: string });
  }

  async getTimerState(): Promise<TimerState | null> {
    const row = await db.timerState.get('current');
    if (!row) return null;
    const { id: _id, ...timerState } = row as TimerState & { id: string };
    return timerState;
  }

  async clearTimerState(): Promise<void> {
    await db.timerState.delete('current');
  }

  // Processes
  async getProceso(proceso: number): Promise<Proceso | null> {
    return await db.processes.get(proceso) || null;
  }

  async upsertProceso(p: Proceso): Promise<void> {
    await db.processes.put(p, p.proceso);
  }

  // Process Recents
  async addRecentProcess(proceso: number): Promise<void> {
    await db.processRecents.put({ proceso, lastUsedAt: Date.now() }, proceso);
  }

  async getRecentProcesses(): Promise<Proceso[]> {
    const recents = await db.processRecents
      .orderBy('lastUsedAt')
      .reverse()
      .toArray();
    const results: Proceso[] = [];
    for (const r of recents) {
      const p = await db.processes.get(r.proceso);
      if (p) results.push(p);
    }
    return results;
  }
}

// Exportar instancia singleton
export const indexedDBStorage = new IndexedDBStorage();
