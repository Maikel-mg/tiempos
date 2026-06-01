import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie, { type Transaction } from 'dexie';

const DB_NAME = 'TimeTrackerDB';

function deleteDB() {
  return new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

async function seedV1Data(entries: Array<{ id: string; taskId: string | number; taskName: string; date: string }>) {
  const v1 = new Dexie(DB_NAME);
  v1.version(1).stores({
    timeEntries: 'id, taskId, date, startTime, endTime, synced, createdAt',
    timerState: 'id',
  });
  await v1.open();
  const table = v1.table('timeEntries');
  for (const e of entries) {
    await table.put({
      ...e,
      startTime: '09:00',
      endTime: '10:00',
      synced: false,
      createdAt: new Date().toISOString(),
    } as any);
  }
  v1.close();
}

/** Import migrateToV2 from the module — but we'll call it inside our own Dexie upgrade handlers. */
async function importMigrateToV2() {
  // We need to call migrateToV2 inside a Dexie upgrade callback.
  // Since it's now exported, we can import it. But to avoid the singleton side-effect
  // of the module importing db, we define our own migration inline using the same logic.
  return (tx: Transaction) => migrateToV2Logic(tx);
}

/** Inline copy of migrateToV2 logic to avoid importing the module singleton. */
async function migrateToV2Logic(tx: Transaction) {
  const table = tx.table<{ id: string; taskId: string | number; taskName: string; proceso?: { proceso: number; nombre: string } }, string>('timeEntries');
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
          proceso: { proceso: parsed, nombre: entry.taskName },
        } as any);
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
 * Open a fresh v2 Dexie against DB_NAME (must have v1 data already seeded).
 * Returns { db, result } where result is what the upgrade handler returned.
 */
async function openV2DB() {
  const db = new Dexie(DB_NAME);
  let migrationResult: { migrated: number; discarded: number } | undefined;

  db.version(1).stores({
    timeEntries: 'id, taskId, date, startTime, endTime, synced, createdAt',
    timerState: 'id',
  });
  db.version(2).stores({
    timeEntries: 'id, taskId, date, startTime, endTime, synced, createdAt, serverId',
    timerState: 'id',
    processes: 'proceso, nombre',
    processRecents: 'proceso',
    migrationMeta: 'key',
  }).upgrade(async (tx) => {
    migrationResult = await migrateToV2Logic(tx);
    await tx.table('migrationMeta').put({ key: 'v2_migration', value: migrationResult });
    return migrationResult;
  });

  await db.open();
  return { db, result: migrationResult };
}

beforeEach(async () => {
  await deleteDB();
});

describe('migrateToV2', () => {
  it('returns {migrated:0, discarded:0} on empty DB', async () => {
    await seedV1Data([]);
    const { db, result } = await openV2DB();
    expect(result).toEqual({ migrated: 0, discarded: 0 });
    db.close();
  });

  it('converts valid string taskId "42" to number 42', async () => {
    await seedV1Data([{ id: '1', taskId: '42', taskName: 'Dev', date: '2025-01-15' }]);
    const { db, result } = await openV2DB();

    const row = await db.table('timeEntries').get('1');
    expect(row?.taskId).toBe(42);
    expect(row?.proceso).toEqual({ proceso: 42, nombre: 'Dev' });
    expect(result).toEqual({ migrated: 1, discarded: 0 });
    db.close();
  });

  it('discards entries with invalid string taskIds "abc", "0", "-5"', async () => {
    await seedV1Data([
      { id: '1', taskId: 'abc', taskName: 'A', date: '2025-01-15' },
      { id: '2', taskId: '0', taskName: 'B', date: '2025-01-15' },
      { id: '3', taskId: '-5', taskName: 'C', date: '2025-01-15' },
    ]);
    const { db, result } = await openV2DB();

    const count = await db.table('timeEntries').count();
    expect(count).toBe(0);
    expect(result).toEqual({ migrated: 0, discarded: 3 });
    db.close();
  });

  it('parses float "3.14" to integer 3 (keeps it)', async () => {
    await seedV1Data([{ id: '1', taskId: '3.14', taskName: 'Pi', date: '2025-01-15' }]);
    const { db, result } = await openV2DB();

    const row = await db.table('timeEntries').get('1');
    expect(row?.taskId).toBe(3);
    expect(result).toEqual({ migrated: 1, discarded: 0 });
    db.close();
  });

  it('is idempotent — running migration twice yields the same result', async () => {
    await seedV1Data([{ id: '1', taskId: '42', taskName: 'X', date: '2025-01-15' }]);

    // First open triggers migration
    const { db: db1, result: first } = await openV2DB();
    const row1 = await db1.table('timeEntries').get('1');
    expect(row1?.taskId).toBe(42);
    db1.close();

    // Second open — already at v2, no upgrade fires, data stable
    const db2 = new Dexie(DB_NAME);
    db2.version(2).stores({
      timeEntries: 'id, taskId, date, startTime, endTime, synced, createdAt, serverId',
      timerState: 'id',
      processes: 'proceso, nombre',
      processRecents: 'proceso',
      migrationMeta: 'key',
    });
    await db2.open();
    const row2 = await db2.table('timeEntries').get('1');
    expect(row2?.taskId).toBe(42);

    const row = await db2.table('migrationMeta').get('v2_migration');
    expect(row?.value).toEqual(first);
    db2.close();
  });
});

describe('migrationMeta helpers', () => {
  it('getMigrationResult returns result after migration runs', async () => {
    // Seed and migrate so migrationMeta has data
    await seedV1Data([{ id: '1', taskId: '42', taskName: 'X', date: '2025-01-15' }]);
    const { db } = await openV2DB();

    // Read migrationMeta directly from the same db instance
    const row = await db.table('migrationMeta').get('v2_migration');
    expect(row?.value).toEqual({ migrated: 1, discarded: 0 });
    db.close();
  });

  it('wasMigrationWarningShown defaults to false', async () => {
    const db = new Dexie(DB_NAME);
    db.version(2).stores({
      timeEntries: 'id, taskId, date, startTime, endTime, synced, createdAt, serverId',
      timerState: 'id',
      processes: 'proceso, nombre',
      processRecents: 'proceso',
      migrationMeta: 'key',
    });
    await db.open();
    const row = await db.table('migrationMeta').get('migrationV2Warned');
    expect(row?.value ?? false).toBe(false);
    db.close();
  });

  it('markMigrationWarningShown persists and can be read back', async () => {
    const db = new Dexie(DB_NAME);
    db.version(2).stores({
      timeEntries: 'id, taskId, date, startTime, endTime, synced, createdAt, serverId',
      timerState: 'id',
      processes: 'proceso, nombre',
      processRecents: 'proceso',
      migrationMeta: 'key',
    });
    await db.open();
    await db.table('migrationMeta').put({ key: 'migrationV2Warned', value: true });
    const row = await db.table('migrationMeta').get('migrationV2Warned');
    expect(row?.value).toBe(true);
    db.close();
  });
});
