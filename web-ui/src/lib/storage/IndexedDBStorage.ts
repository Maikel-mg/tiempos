import Dexie, { type Table, type Transaction } from 'dexie';
import type { StorageStrategy } from './StorageStrategy';
import type { TimeEntry, TimerState, Proceso } from '../../features/time-tracker/types';
import type { Project, ProjectTreeResponse } from '../../features/projects/types';

/**
 * Fila de la tabla offlineProcesses: un Proceso cacheado por usuario.
 * La primary key es una cadena `${usured}::${proceso}` para aislar cachés por usured.
 */
export interface OfflineProcessRow {
  key: string;
  usured: string;
  proceso: Proceso;
}

/**
 * Fila de la tabla offlineProjects: un Project cacheado por usuario.
 * La primary key es una cadena `${usured}::${CodCli}::${Proyecto}`.
 */
export interface OfflineProjectRow {
  key: string;
  usured: string;
  proyecto: Project;
}

/**
 * Fila de la tabla offlineTree: un árbol de proyecto (disciplinas → fases → procesos)
 * cacheado por usuario y clave proyecto (codCli + proyecto).
 */
export interface OfflineTreeRow {
  key: string;
  usured: string;
  codCli: string;
  proyecto: string;
  tree: ProjectTreeResponse;
}

/**
 * Fila de la tabla offlineMeta: timestamp de última actualización del caché por usuario.
 */
export interface OfflineMetaRow {
  usured: string;
  lastUpdated: number;
}

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
 * Migración v3→v4: crea las tablas offline del caché de procesos por usuario
 * (offlineProcesses, offlineProjects, offlineTree, offlineMeta). Es un cambio
 * de solo esquema: las tablas nuevas se crean automáticamente al declarar la
 * versión 4. La función existe para registrar el resultado en migrationMeta,
 * consistente con las migraciones v2/v3.
 */
export async function migrateToV4(tx: Transaction): Promise<{ created: boolean }> {
  await tx.table('migrationMeta').get('v4_migration');
  return { created: true };
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
  offlineProcesses!: Table<OfflineProcessRow, string>;
  offlineProjects!: Table<OfflineProjectRow, string>;
  offlineTree!: Table<OfflineTreeRow, string>;
  offlineMeta!: Table<OfflineMetaRow, string>;

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

    this.version(4).stores({
      timeEntries: 'id, taskId, date, startTime, endTime, synced, createdAt, serverId, recoverable',
      timerState: 'id',
      processes: 'proceso, nombre, faseNombre, proyectoNombre, clienteNombre',
      processRecents: 'proceso, lastUsedAt',
      migrationMeta: 'key',
      offlineProcesses: 'key, usured, proceso',
      offlineProjects: 'key, usured',
      offlineTree: 'key, usured, codCli, proyecto',
      offlineMeta: 'usured',
    }).upgrade(async (tx) => {
      const result = await migrateToV4(tx);
      await tx.table('migrationMeta').put({ key: 'v4_migration', value: result });
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
}

// Exportar instancia singleton
export const indexedDBStorage = new IndexedDBStorage();
