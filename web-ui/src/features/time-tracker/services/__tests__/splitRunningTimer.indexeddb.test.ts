import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db, indexedDBStorage } from '@/lib/storage/IndexedDBStorage';
import { TimeTrackingService } from '../timeTrackingService';
import type { TimeEntry } from '../../types';

const DB_NAME = 'TimeTrackerDB';

function deleteDB(): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

/** El ancla del timer no vive en el almacén: sólo aporta los horarios a dividir. */
const timerEntry: TimeEntry = {
  id: 'timer-activo',
  taskId: 1,
  taskName: 'Test',
  proceso: { proceso: 1, nombre: 'Test' },
  date: '2025-06-11',
  startTime: '09:00',
  endTime: '11:00',
  duration: 7200,
  createdAt: '2025-06-11T09:00:00Z',
  updatedAt: '2025-06-11T09:00:00Z',
  synced: false,
};

describe('splitRunningTimer contra IndexedDB', () => {
  let service: TimeTrackingService;

  beforeEach(async () => {
    db.close();
    await deleteDB();
    await db.open();
    service = new TimeTrackingService(indexedDBStorage);
  });

  afterEach(() => {
    db.close();
  });

  it('persiste la primera mitad con id propio y permite dividir dos veces seguidas', async () => {
    const first = await service.splitRunningTimer(timerEntry, '10:00');
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    // Con el id heredado del ancla ('timer-activo') este segundo `add` reventaba
    // con ConstraintError: "Key already exists in the object store".
    const second = await service.splitRunningTimer(timerEntry, '10:30');
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    expect(first.first.id).not.toBe(second.first.id);

    const stored = await indexedDBStorage.getAllEntries();
    expect(stored).toHaveLength(2);
    expect(stored.map((entry) => entry.id).sort()).toEqual(
      [first.first.id, second.first.id].sort(),
    );
  });
});
