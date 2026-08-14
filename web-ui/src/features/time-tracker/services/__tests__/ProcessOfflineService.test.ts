import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProcessOfflineService, type ProcessOfflineApiClient } from '../ProcessOfflineService';
import { InMemoryProcessOfflineStorage } from '@/lib/storage/__tests__/InMemoryProcessOfflineStorage';
import type { Proceso } from '../../types';
import type { Project, ProjectTreeResponse } from '../../../projects/types';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockDbGet = vi.fn();

vi.mock('@/config/stores', () => ({
  dbConfig: { get: () => mockDbGet() },
}));

// ── Test data ────────────────────────────────────────────────────────────────

const DB_CONFIG = {
  server: 'test-server',
  database: 'test-db',
  username: 'test-user',
  password: 'test-pass',
};

const PROCESOS_A: Proceso[] = [
  { proceso: 101, nombre: 'Desarrollo Frontend', faseNombre: 'Fase Construccion' },
  { proceso: 102, nombre: 'Desarrollo Backend', faseNombre: 'Fase Construccion' },
];

const PROCESOS_B: Proceso[] = [
  { proceso: 201, nombre: 'Testing Unitario', faseNombre: 'Fase Testing' },
];

const PROJECTS: Project[] = [
  {
    CodCli: '1',
    Cliente: 'CLI001',
    NomCliente: 'Acme Corp',
    NomProy: 'Proyecto Alpha',
    Proyecto: '100',
    Abierto: true,
    IdDpto: '5',
    NomDpto: 'Desarrollo',
    IdAplicacion: 'APP1',
    UsuredRespRev: 'MG01',
  },
];

const TREE: ProjectTreeResponse = {
  cliente: { codCli: 1, cliente: 'CLI001', nomCliente: 'Acme Corp' },
  proyecto: { codCli: 1, proyecto: 100, nomProy: 'Proyecto Alpha', cerrado: false, cmmi: false, esCM: false, esPET: false },
  disciplinas: [
    {
      idDisciplina: 1,
      nombre: 'Desarrollo',
      sinDisciplina: false,
      orden: 1,
      fases: [
        {
          fase: 10,
          nombre: 'Fase Construccion',
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
};

function createMockApiClient(): ProcessOfflineApiClient {
  const post = vi.fn(async (url: string) => {
    if (url === '/processes') return { success: true, data: { success: true, data: PROCESOS_A } };
    if (url === '/projects') return { success: true, data: { success: true, data: PROJECTS } };
    if (url === '/projects-tree') return { success: true, data: { success: true, data: TREE } };
    throw new Error(`Unexpected URL: ${url}`);
  }) as unknown as ProcessOfflineApiClient['post'];
  return { post };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function createService(apiClient = createMockApiClient()) {
  const storage = new InMemoryProcessOfflineStorage();
  const service = new ProcessOfflineService(storage, apiClient);
  return { storage, service, apiClient };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ProcessOfflineService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbGet.mockReturnValue(DB_CONFIG);
  });

  describe('getProcesses', () => {
    it('reads from cache without hitting the API when cache has data', async () => {
      const { storage, service, apiClient } = createService();
      await storage.saveProcesses('USER_A', PROCESOS_A);

      const result = await service.getProcesses('USER_A');

      expect(result).toEqual(PROCESOS_A);
      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('falls back to the backend when cache is empty, persists, and returns', async () => {
      const { storage, service, apiClient } = createService();

      const result = await service.getProcesses('USER_A');

      expect(result).toEqual(PROCESOS_A);
      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(apiClient.post).toHaveBeenCalledWith('/processes', {
        usured: 'USER_A',
        server: 'test-server',
        database: 'test-db',
        username: 'test-user',
        password: 'test-pass',
      });
      expect(await storage.getProcesses('USER_A')).toEqual(PROCESOS_A);
    });

    it('forces a backend fetch on explicit refresh even when cache has data', async () => {
      const { storage, service, apiClient } = createService();
      await storage.saveProcesses('USER_A', PROCESOS_A);

      const result = await service.getProcesses('USER_A', { refresh: true });

      expect(result).toEqual(PROCESOS_A);
      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(apiClient.post).toHaveBeenCalledWith('/processes', expect.objectContaining({ usured: 'USER_A' }));
    });

    it('persists data and last-update timestamp after a backend fetch', async () => {
      const { storage, service } = createService();

      const before = Date.now();
      await service.getProcesses('USER_A');

      expect(await storage.getProcesses('USER_A')).toEqual(PROCESOS_A);
      const lastUpdated = await storage.getLastUpdated('USER_A');
      expect(lastUpdated).not.toBeNull();
      expect(lastUpdated!).toBeGreaterThanOrEqual(before);
    });

    it('does not persist partial data when the API fails', async () => {
      const apiClient = {
        post: vi.fn(async () => ({ success: true, data: { success: false, message: 'Server error' } })),
      } as unknown as ProcessOfflineApiClient;
      const { storage, service } = createService(apiClient);

      await expect(service.getProcesses('USER_A')).rejects.toThrow('Server error');

      expect(await storage.getProcesses('USER_A')).toEqual([]);
      expect(await storage.getLastUpdated('USER_A')).toBeNull();
    });
  });

  describe('per-user isolation', () => {
    it('keeps each user cache separate and never mixes reads', async () => {
      const apiClient = {
        post: vi.fn(async (url: string) => {
          if (url === '/processes') return { success: true, data: { success: true, data: PROCESOS_B } };
          return { success: true, data: { success: true, data: [] } };
        }),
      } as unknown as ProcessOfflineApiClient;
      const { storage, service } = createService(apiClient);

      // User A fetches from backend (empty cache) and caches A's data.
      const a1 = await service.getProcesses('USER_A');
      expect(a1).toEqual(PROCESOS_B);

      // A second read for A is served from cache — no extra API call.
      await service.getProcesses('USER_A');
      expect(apiClient.post).toHaveBeenCalledTimes(1);

      // User B starts with an empty cache and falls back to the backend.
      const b1 = await service.getProcesses('USER_B');
      expect(b1).toEqual(PROCESOS_B);
      expect(apiClient.post).toHaveBeenCalledTimes(2);

      // A's cache is untouched by B's fetch.
      expect(await storage.getProcesses('USER_A')).toEqual(PROCESOS_B);
      expect(await storage.getProcesses('USER_B')).toEqual(PROCESOS_B);
      expect(await storage.getLastUpdated('USER_A')).not.toBeNull();
      expect(await storage.getLastUpdated('USER_B')).not.toBeNull();
    });

    it('serves different cached data per user without touching the API', async () => {
      const { storage, service, apiClient } = createService();
      await storage.saveProcesses('USER_A', PROCESOS_A);
      await storage.saveProcesses('USER_B', PROCESOS_B);

      const a = await service.getProcesses('USER_A');
      const b = await service.getProcesses('USER_B');

      expect(a).toEqual(PROCESOS_A);
      expect(b).toEqual(PROCESOS_B);
      expect(apiClient.post).not.toHaveBeenCalled();
    });
  });

  describe('getLastUpdated', () => {
    it('returns null when the user has no cache yet', async () => {
      const { service } = createService();

      expect(await service.getLastUpdated('USER_A')).toBeNull();
    });

    it('returns the timestamp after a fetch', async () => {
      const { service } = createService();

      await service.getProcesses('USER_A');

      expect(await service.getLastUpdated('USER_A')).not.toBeNull();
    });

    it('is isolated per user', async () => {
      const { storage, service } = createService();
      await storage.setLastUpdated('USER_A', 1000);

      expect(await service.getLastUpdated('USER_A')).toBe(1000);
      expect(await service.getLastUpdated('USER_B')).toBeNull();
    });
  });

  describe('getProjects', () => {
    it('reads from cache without hitting the API when cache has data', async () => {
      const { storage, service, apiClient } = createService();
      await storage.saveProjects('USER_A', PROJECTS);

      const result = await service.getProjects('USER_A');

      expect(result).toEqual(PROJECTS);
      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('falls back to the backend with dbConfig payload and persists', async () => {
      const { storage, service, apiClient } = createService();

      const result = await service.getProjects('USER_A');

      expect(result).toEqual(PROJECTS);
      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(apiClient.post).toHaveBeenCalledWith(
        '/projects',
        expect.objectContaining({
          server: 'test-server',
          database: 'test-db',
          username: 'test-user',
          password: 'test-pass',
          modoProc: '',
          usured: 'USER_A',
        })
      );
      expect(await storage.getProjects('USER_A')).toEqual(PROJECTS);
    });

    it('forces a backend fetch on explicit refresh', async () => {
      const { storage, service, apiClient } = createService();
      await storage.saveProjects('USER_A', PROJECTS);

      await service.getProjects('USER_A', { refresh: true });

      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(apiClient.post).toHaveBeenCalledWith('/projects', expect.objectContaining({ usured: 'USER_A' }));
    });
  });

  describe('getProjectTree', () => {
    it('reads from cache without hitting the API when tree is cached', async () => {
      const { storage, service, apiClient } = createService();
      await storage.saveProjectTree('USER_A', '1', '100', TREE);

      const result = await service.getProjectTree('USER_A', '1', '100');

      expect(result).toEqual(TREE);
      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('falls back to the backend with dbConfig payload and persists per user and project key', async () => {
      const { storage, service, apiClient } = createService();

      const result = await service.getProjectTree('USER_A', '1', '100');

      expect(result).toEqual(TREE);
      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(apiClient.post).toHaveBeenCalledWith(
        '/projects-tree',
        expect.objectContaining({
          server: 'test-server',
          database: 'test-db',
          username: 'test-user',
          password: 'test-pass',
          codCli: '1',
          proyecto: '100',
        })
      );
      expect(await storage.getProjectTree('USER_A', '1', '100')).toEqual(TREE);
    });

    it('keeps trees isolated per user and per project key', async () => {
      const { storage, service, apiClient } = createService();
      await storage.saveProjectTree('USER_A', '1', '100', TREE);

      // Same key for another user: no cache → backend fetch.
      const forB = await service.getProjectTree('USER_B', '1', '100');
      expect(forB).toEqual(TREE);
      expect(apiClient.post).toHaveBeenCalledTimes(1);

      // Different key for user A: no cache → backend fetch.
      const otherKey = await service.getProjectTree('USER_A', '2', '200');
      expect(otherKey).toEqual(TREE);
      expect(apiClient.post).toHaveBeenCalledTimes(2);

      // Original key for user A still served from cache.
      const again = await service.getProjectTree('USER_A', '1', '100');
      expect(again).toEqual(TREE);
      expect(apiClient.post).toHaveBeenCalledTimes(2);
    });
  });
});
