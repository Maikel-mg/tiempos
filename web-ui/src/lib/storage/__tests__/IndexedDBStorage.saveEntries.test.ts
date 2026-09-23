import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db, indexedDBStorage } from '../IndexedDBStorage';
import type { TimeEntry } from '../../../features/time-tracker/types';

const DB_NAME = 'TimeTrackerDB';

function deleteDB(): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'entry-1',
    taskId: 100,
    taskName: 'Desarrollo',
    proceso: { proceso: 100, nombre: 'Desarrollo' },
    date: '2026-01-15',
    startTime: '09:12',
    endTime: '11:00',
    duration: 6480,
    description: 'Revisión de importaciones',
    createdAt: '2026-01-15T09:12:00Z',
    updatedAt: '2026-01-15T09:12:00Z',
    synced: false,
    ...overrides,
  };
}

describe('IndexedDBStorage.saveEntries', () => {
  beforeEach(async () => {
    db.close();
    await deleteDB();
    await db.open();
  });

  afterEach(() => {
    db.close();
  });

  it('escribe todas las entradas y se leen de vuelta', async () => {
    const first = makeEntry();
    const second = makeEntry({ id: 'entry-2', startTime: '11:00', endTime: '12:47' });

    await indexedDBStorage.saveEntries([first, second]);

    expect(await indexedDBStorage.getEntry('entry-2')).toEqual(second);
    const all = await indexedDBStorage.getAllEntries();
    expect(all.map((entry) => entry.id).sort()).toEqual(['entry-1', 'entry-2']);
  });

  it('sobrescribe una entrada existente sin duplicarla', async () => {
    await indexedDBStorage.saveEntry(makeEntry());

    await indexedDBStorage.saveEntries([makeEntry({ endTime: '11:00', duration: 6480 })]);

    const all = await indexedDBStorage.getAllEntries();
    expect(all).toHaveLength(1);
    expect(all[0].endTime).toBe('11:00');
  });

  it('no escribe ninguna si una de las entradas falla', async () => {
    const valid = makeEntry();
    // Una función no se puede clonar en IndexedDB: revienta la transacción.
    const unclonable = { ...makeEntry({ id: 'entry-2' }), imposible: () => undefined } as unknown as TimeEntry;

    await expect(indexedDBStorage.saveEntries([valid, unclonable])).rejects.toThrow();

    expect(await indexedDBStorage.getAllEntries()).toEqual([]);
  });

  it('sin entradas no hace nada', async () => {
    await expect(indexedDBStorage.saveEntries([])).resolves.toBeUndefined();
    expect(await indexedDBStorage.getAllEntries()).toEqual([]);
  });
});
