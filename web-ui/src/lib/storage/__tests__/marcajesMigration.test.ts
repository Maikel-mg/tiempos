import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';

const DB_NAME = 'TimeTrackerDB';

const SCHEMA_V4 = {
  timeEntries: 'id, taskId, date, startTime, endTime, synced, createdAt, serverId, recoverable',
  timerState: 'id',
  processes: 'proceso, nombre, faseNombre, proyectoNombre, clienteNombre',
  processRecents: 'proceso, lastUsedAt',
  localProcesses: 'proceso, nombre',
  migrationMeta: 'key',
};

function registro(id: string, date: string) {
  return {
    id,
    taskId: 10,
    taskName: 'Clasificador',
    proceso: { proceso: 10, nombre: 'Clasificador' },
    date,
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600,
    synced: false,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
  };
}

/** Un usuario con la versión anterior de la app: Registros guardados en v4. */
async function seedV4() {
  const v4 = new Dexie(DB_NAME);
  v4.version(4).stores(SCHEMA_V4);
  await v4.open();
  await v4.table('timeEntries').bulkPut([registro('r1', '2026-11-02'), registro('r2', '2026-11-03')]);
  v4.close();
}

describe('almacén local — subida a v5 con la caché de marcajes', () => {
  beforeEach(async () => {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });

  it('crea las tablas de marcajes sin perder ni degradar los Registros existentes', async () => {
    await seedV4();

    // El módulo abre la base al primer uso: dispara la migración real de la app.
    const { db } = await import('@/lib/storage/IndexedDBStorage');
    await db.open();

    expect(db.verno).toBe(5);
    const entries = await db.timeEntries.toArray();
    expect(entries.map((entry) => entry.id).sort()).toEqual(['r1', 'r2']);
    expect(entries[0].duration).toBe(3600);
    expect(entries[0].proceso).toEqual({ proceso: 10, nombre: 'Clasificador' });
    expect(await db.marcajes.count()).toBe(0);
    expect(await db.marcajeDias.count()).toBe(0);

    db.close();
  });
});
