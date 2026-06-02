import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { useProcessCache } from '../useProcessCache';
import type { Proceso } from '../../types';

// ── Test data ────────────────────────────────────────────────────────────────

const MOCK_API_RESPONSE = {
  success: true,
  data: {
    cliente: { CodCli: 1, Cliente: 'CLI001', NomCliente: 'Acme Corp' },
    proyecto: { CodCli: 1, Proyecto: 100, NomProy: 'Proyecto Alpha', Cerrado: false, CMMI: false, EsCM: false, EsPET: false },
    disciplinas: [
      {
        idDisciplina: 1,
        nombre: 'Desarrollo',
        sinDisciplina: false,
        orden: 1,
        fases: [
          {
            fase: 10,
            nombre: 'Fase Construcción',
            cerrado: false,
            orden: 1,
            procesos: [
              { proceso: 101, nombre: 'Desarrollo Frontend' },
              { proceso: 102, nombre: 'Desarrollo Backend' },
            ],
          },
        ],
      },
    ],
  },
};

const SEED_PROCESSES: Proceso[] = [
  { proceso: 101, nombre: 'Desarrollo Frontend', faseNombre: 'Fase Construcción', proyectoNombre: 'Proyecto Alpha', clienteNombre: 'Acme Corp' },
  { proceso: 102, nombre: 'Desarrollo Backend', faseNombre: 'Fase Construcción', proyectoNombre: 'Proyecto Alpha', clienteNombre: 'Acme Corp' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const DB_NAME = 'UseProcessCacheTestDB';

function deleteDB() {
  return new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

function createTestDB() {
  const db = new Dexie(DB_NAME);
  db.version(1).stores({
    processes: 'proceso, nombre, faseNombre, proyectoNombre, clienteNombre',
    processRecents: 'proceso, lastUsedAt',
  });
  return db;
}

function createMockApiClient(response: unknown) {
  return { post: vi.fn().mockResolvedValue(response) };
}

/** Seed IndexedDB with test processes */
async function seedProcesses(db: Dexie, processes: Proceso[]) {
  await db.table('processes').bulkPut(processes);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useProcessCache', () => {
  beforeEach(async () => {
    await deleteDB();
  });

  it('loads processes from IndexedDB on mount', async () => {
    const db = createTestDB();
    await seedProcesses(db, SEED_PROCESSES);
    const apiClient = createMockApiClient(MOCK_API_RESPONSE);

    const { result } = renderHook(() => useProcessCache(db, apiClient as any));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.processes).toHaveLength(2);
    expect(result.current.processes[0].nombre).toBe('Desarrollo Frontend');
    expect(result.current.error).toBeNull();
    db.close();
  });

  it('returns sample data when IndexedDB is empty', async () => {
    const db = createTestDB();
    const apiClient = createMockApiClient(MOCK_API_RESPONSE);

    const { result } = renderHook(() => useProcessCache(db, apiClient as any));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Falls back to sample data so the selector isn't empty on first use
    expect(result.current.processes.length).toBeGreaterThan(0);
    expect(result.current.error).toBeNull();
    db.close();
  });

  it('search filters in-memory processes', async () => {
    const db = createTestDB();
    await seedProcesses(db, SEED_PROCESSES);
    const apiClient = createMockApiClient(MOCK_API_RESPONSE);

    const { result } = renderHook(() => useProcessCache(db, apiClient as any));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const filtered = result.current.search('frontend');

    expect(filtered).toHaveLength(1);
    expect(filtered[0].proceso).toBe(101);
    db.close();
  });

  it('search returns all for empty string', async () => {
    const db = createTestDB();
    await seedProcesses(db, SEED_PROCESSES);
    const apiClient = createMockApiClient(MOCK_API_RESPONSE);

    const { result } = renderHook(() => useProcessCache(db, apiClient as any));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const filtered = result.current.search('');

    expect(filtered).toHaveLength(2);
    db.close();
  });

  it('getRecent returns recently used processes', async () => {
    const db = createTestDB();
    await seedProcesses(db, SEED_PROCESSES);
    const apiClient = createMockApiClient(MOCK_API_RESPONSE);

    const { result } = renderHook(() => useProcessCache(db, apiClient as any));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.markUsed(SEED_PROCESSES[0]);
    });

    const recent = await result.current.getRecent(10);

    expect(recent).toHaveLength(1);
    expect(recent[0].proceso).toBe(101);
    db.close();
  });

  it('refresh reads from IndexedDB after repo.refresh()', async () => {
    const db = createTestDB();
    const apiClient = createMockApiClient(MOCK_API_RESPONSE);

    const { result } = renderHook(() => useProcessCache(db, apiClient as any));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Seed processes directly (simulating repo.refresh() writing to IndexedDB)
    await seedProcesses(db, SEED_PROCESSES);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.processes).toHaveLength(2);
    db.close();
  });
});
