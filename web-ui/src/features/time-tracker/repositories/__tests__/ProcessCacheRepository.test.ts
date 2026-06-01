import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { ProcessCacheRepository } from '../ProcessCacheRepository';
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
          {
            fase: 20,
            nombre: 'Fase Testing',
            cerrado: false,
            orden: 2,
            procesos: [
              { proceso: 201, nombre: 'Testing Unitario' },
            ],
          },
        ],
      },
      {
        idDisciplina: 2,
        nombre: 'Gestión',
        sinDisciplina: false,
        orden: 2,
        fases: [
          {
            fase: 30,
            nombre: 'Fase PMO',
            cerrado: false,
            orden: 1,
            procesos: [
              { proceso: 301, nombre: 'Reunión de Avance' },
            ],
          },
        ],
      },
    ],
  },
};

const FLATTENED_PROCESSES: Proceso[] = [
  { proceso: 101, nombre: 'Desarrollo Frontend', faseNombre: 'Fase Construcción', proyectoNombre: 'Proyecto Alpha', clienteNombre: 'Acme Corp' },
  { proceso: 102, nombre: 'Desarrollo Backend', faseNombre: 'Fase Construcción', proyectoNombre: 'Proyecto Alpha', clienteNombre: 'Acme Corp' },
  { proceso: 201, nombre: 'Testing Unitario', faseNombre: 'Fase Testing', proyectoNombre: 'Proyecto Alpha', clienteNombre: 'Acme Corp' },
  { proceso: 301, nombre: 'Reunión de Avance', faseNombre: 'Fase PMO', proyectoNombre: 'Proyecto Alpha', clienteNombre: 'Acme Corp' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const DB_NAME = 'ProcessCacheTestDB';

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

function createFailingApiClient(error: string) {
  return { post: vi.fn().mockRejectedValue(new Error(error)) };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ProcessCacheRepository', () => {
  beforeEach(async () => {
    await deleteDB();
  });

  describe('getAll', () => {
    it('returns empty array when cache is empty and fetches from API', async () => {
      const db = createTestDB();
      const apiClient = createMockApiClient(MOCK_API_RESPONSE);
      const repo = new ProcessCacheRepository(db, apiClient as any);

      const result = await repo.getAll();

      expect(result).toEqual(FLATTENED_PROCESSES);
      expect(apiClient.post).toHaveBeenCalledOnce();
      db.close();
    });

    it('serves from cache on subsequent calls without hitting API', async () => {
      const db = createTestDB();
      const apiClient = createMockApiClient(MOCK_API_RESPONSE);
      const repo = new ProcessCacheRepository(db, apiClient as any);

      await repo.getAll();
      const second = await repo.getAll();

      expect(second).toEqual(FLATTENED_PROCESSES);
      expect(apiClient.post).toHaveBeenCalledOnce();
      db.close();
    });

    it('persists processes in IndexedDB after fetch', async () => {
      const db = createTestDB();
      const apiClient = createMockApiClient(MOCK_API_RESPONSE);
      const repo = new ProcessCacheRepository(db, apiClient as any);

      await repo.getAll();

      const count = await db.table('processes').count();
      expect(count).toBe(4);
      db.close();
    });
  });

  describe('getById', () => {
    it('returns a process by ID', async () => {
      const db = createTestDB();
      const apiClient = createMockApiClient(MOCK_API_RESPONSE);
      const repo = new ProcessCacheRepository(db, apiClient as any);

      const result = await repo.getById(101);

      expect(result).toEqual(FLATTENED_PROCESSES[0]);
      db.close();
    });

    it('returns undefined for non-existent ID', async () => {
      const db = createTestDB();
      const apiClient = createMockApiClient(MOCK_API_RESPONSE);
      const repo = new ProcessCacheRepository(db, apiClient as any);

      const result = await repo.getById(999);

      expect(result).toBeUndefined();
      db.close();
    });
  });

  describe('search', () => {
    it('matches against nombre (case-insensitive)', async () => {
      const db = createTestDB();
      const apiClient = createMockApiClient(MOCK_API_RESPONSE);
      const repo = new ProcessCacheRepository(db, apiClient as any);

      const result = await repo.search('frontend');

      expect(result).toHaveLength(1);
      expect(result[0].proceso).toBe(101);
      db.close();
    });

    it('matches against faseNombre (case-insensitive)', async () => {
      const db = createTestDB();
      const apiClient = createMockApiClient(MOCK_API_RESPONSE);
      const repo = new ProcessCacheRepository(db, apiClient as any);

      const result = await repo.search('construcción');

      expect(result).toHaveLength(2);
      expect(result.map(p => p.proceso)).toEqual([101, 102]);
      db.close();
    });

    it('matches against proyectoNombre (case-insensitive)', async () => {
      const db = createTestDB();
      const apiClient = createMockApiClient(MOCK_API_RESPONSE);
      const repo = new ProcessCacheRepository(db, apiClient as any);

      const result = await repo.search('alpha');

      expect(result).toHaveLength(4);
      db.close();
    });

    it('returns empty array when no match', async () => {
      const db = createTestDB();
      const apiClient = createMockApiClient(MOCK_API_RESPONSE);
      const repo = new ProcessCacheRepository(db, apiClient as any);

      const result = await repo.search('xyz123');

      expect(result).toHaveLength(0);
      db.close();
    });

    it('returns all processes for empty search string', async () => {
      const db = createTestDB();
      const apiClient = createMockApiClient(MOCK_API_RESPONSE);
      const repo = new ProcessCacheRepository(db, apiClient as any);

      const result = await repo.search('');

      expect(result).toHaveLength(4);
      db.close();
    });
  });

  describe('getRecent', () => {
    it('returns top N processes by lastUsedAt desc', async () => {
      const db = createTestDB();
      const apiClient = createMockApiClient(MOCK_API_RESPONSE);
      const repo = new ProcessCacheRepository(db, apiClient as any);

      await repo.getAll();
      // Mark processes with time gaps to ensure ordering
      await repo.markUsed(101);
      await new Promise(r => setTimeout(r, 10));
      await repo.markUsed(301);
      await new Promise(r => setTimeout(r, 10));
      await repo.markUsed(201);

      const result = await repo.getRecent(2);

      expect(result).toHaveLength(2);
      expect(result[0].proceso).toBe(201);
      expect(result[1].proceso).toBe(301);
      db.close();
    });

    it('defaults to 10 when no limit specified', async () => {
      const db = createTestDB();
      const apiClient = createMockApiClient(MOCK_API_RESPONSE);
      const repo = new ProcessCacheRepository(db, apiClient as any);

      await repo.getAll();
      for (const p of FLATTENED_PROCESSES) {
        await repo.markUsed(p.proceso);
      }

      const result = await repo.getRecent();

      expect(result).toHaveLength(4);
      db.close();
    });

    it('returns empty array when no processes marked as used', async () => {
      const db = createTestDB();
      const apiClient = createMockApiClient(MOCK_API_RESPONSE);
      const repo = new ProcessCacheRepository(db, apiClient as any);

      const result = await repo.getRecent();

      expect(result).toHaveLength(0);
      db.close();
    });
  });

  describe('refresh', () => {
    it('re-fetches from API and replaces processes table atomically', async () => {
      const db = createTestDB();
      const apiClient = createMockApiClient(MOCK_API_RESPONSE);
      const repo = new ProcessCacheRepository(db, apiClient as any);

      await repo.getAll();
      expect(apiClient.post).toHaveBeenCalledOnce();

      const UPDATED_RESPONSE = {
        ...MOCK_API_RESPONSE,
        data: {
          ...MOCK_API_RESPONSE.data,
          disciplinas: [
            {
              idDisciplina: 1,
              nombre: 'Dev',
              sinDisciplina: false,
              orden: 1,
              fases: [
                {
                  fase: 10,
                  nombre: 'Fase 1',
                  cerrado: false,
                  orden: 1,
                  procesos: [{ proceso: 999, nombre: 'Nuevo Proceso' }],
                },
              ],
            },
          ],
        },
      };
      apiClient.post.mockResolvedValueOnce(UPDATED_RESPONSE);

      await repo.refresh();

      const all = await repo.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].proceso).toBe(999);
      expect(apiClient.post).toHaveBeenCalledTimes(2);
      db.close();
    });
  });

  describe('markUsed', () => {
    it('upserts into processRecents with lastUsedAt', async () => {
      const db = createTestDB();
      const apiClient = createMockApiClient(MOCK_API_RESPONSE);
      const repo = new ProcessCacheRepository(db, apiClient as any);

      const before = Date.now();
      await repo.markUsed(101);
      const after = Date.now();

      const recent = await db.table('processRecents').get(101);
      expect(recent).toBeDefined();
      expect(recent!.lastUsedAt).toBeGreaterThanOrEqual(before);
      expect(recent!.lastUsedAt).toBeLessThanOrEqual(after);
      db.close();
    });

    it('updates lastUsedAt on subsequent calls', async () => {
      const db = createTestDB();
      const apiClient = createMockApiClient(MOCK_API_RESPONSE);
      const repo = new ProcessCacheRepository(db, apiClient as any);

      await repo.markUsed(101);
      const first = (await db.table('processRecents').get(101))!.lastUsedAt;

      await new Promise(r => setTimeout(r, 10));
      await repo.markUsed(101);
      const second = (await db.table('processRecents').get(101))!.lastUsedAt;

      expect(second).toBeGreaterThan(first);
      db.close();
    });
  });

  describe('network failure', () => {
    it('surfaces typed error when API call fails', async () => {
      const db = createTestDB();
      const apiClient = createFailingApiClient('Network timeout');
      const repo = new ProcessCacheRepository(db, apiClient as any);

      await expect(repo.getAll()).rejects.toThrow('Network timeout');
      db.close();
    });

    it('does not write partial data on failure', async () => {
      const db = createTestDB();
      const apiClient = createFailingApiClient('Server error');
      const repo = new ProcessCacheRepository(db, apiClient as any);

      await repo.getAll().catch(() => {});

      const count = await db.table('processes').count();
      expect(count).toBe(0);
      db.close();
    });
  });

  describe('empty API response', () => {
    it('handles API returning no disciplines gracefully', async () => {
      const db = createTestDB();
      const emptyResponse = {
        success: true,
        data: {
          cliente: { CodCli: 1, Cliente: 'CLI001', NomCliente: 'Acme' },
          proyecto: { CodCli: 1, Proyecto: 100, NomProy: 'Proj', Cerrado: false, CMMI: false, EsCM: false, EsPET: false },
          disciplinas: [],
        },
      };
      const apiClient = createMockApiClient(emptyResponse);
      const repo = new ProcessCacheRepository(db, apiClient as any);

      const result = await repo.getAll();

      expect(result).toEqual([]);
      db.close();
    });
  });
});
