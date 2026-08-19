import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProcessOfflineService, type ProcessOfflineApiClient } from '../ProcessOfflineService';
import { InMemoryProcessOfflineStorage } from '@/lib/storage/__tests__/InMemoryProcessOfflineStorage';
import type { ProjectTreeResponse } from '../../../projects/types';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockDbGet = vi.fn();

vi.mock('@/config/stores', () => ({
  dbConfig: { get: () => mockDbGet() },
}));

const DB_CONFIG = {
  server: 'test-server',
  database: 'test-db',
  username: 'test-user',
  password: 'test-pass',
};

const TREE: ProjectTreeResponse = {
  cliente: { codCli: 1, cliente: 'CLI001', nomCliente: 'Acme Corp' },
  proyecto: { codCli: 1, proyecto: 100, nomProy: 'Proyecto Alpha', cerrado: false, cmmi: false, esCM: false, esPET: false },
  disciplinas: [],
};

function createMockApiClient(): ProcessOfflineApiClient {
  const post = vi.fn(async () => ({ success: true, data: { success: true, data: null } })) as unknown as ProcessOfflineApiClient['post'];
  return { post };
}

function createService(apiClient = createMockApiClient()) {
  const storage = new InMemoryProcessOfflineStorage();
  const service = new ProcessOfflineService(storage, apiClient);
  return { storage, service, apiClient };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ProcessOfflineService — Proyectos Offline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbGet.mockReturnValue(DB_CONFIG);
  });

  describe('markProjectOffline', () => {
    it('persists the selection with status "pendiente" and a markedAt timestamp', async () => {
      const { service } = createService();

      const result = await service.markProjectOffline('USER_A', {
        codCli: '1',
        proyecto: '100',
        nomProy: 'Proyecto Alpha',
        nomCliente: 'Acme Corp',
      });

      expect(result.status).toBe('pendiente');
      expect(result.markedAt).toBeGreaterThan(0);

      const selections = await service.getOfflineProjectSelections('USER_A');
      expect(selections).toHaveLength(1);
      expect(selections[0]).toEqual({
        codCli: '1',
        proyecto: '100',
        nomProy: 'Proyecto Alpha',
        nomCliente: 'Acme Corp',
        status: 'pendiente',
        markedAt: result.markedAt,
      });
    });
  });

  describe('getOfflineProjectSelections', () => {
    it('returns empty list when the user has no selections', async () => {
      const { service } = createService();

      expect(await service.getOfflineProjectSelections('USER_A')).toEqual([]);
    });

    it('returns only the selections of the requested user (isolated per user)', async () => {
      const { service } = createService();

      await service.markProjectOffline('USER_A', { codCli: '1', proyecto: '100', nomProy: 'Alpha', nomCliente: 'Acme' });
      await service.markProjectOffline('USER_B', { codCli: '2', proyecto: '200', nomProy: 'Beta', nomCliente: 'Corp' });

      const a = await service.getOfflineProjectSelections('USER_A');
      expect(a).toHaveLength(1);
      expect(a[0].codCli).toBe('1');
      expect(a[0].proyecto).toBe('100');

      const b = await service.getOfflineProjectSelections('USER_B');
      expect(b).toHaveLength(1);
      expect(b[0].codCli).toBe('2');
      expect(b[0].proyecto).toBe('200');
    });
  });

  describe('isProjectOffline', () => {
    it('returns true for a marked project of the user', async () => {
      const { service } = createService();
      await service.markProjectOffline('USER_A', { codCli: '1', proyecto: '100', nomProy: 'Alpha', nomCliente: 'Acme' });

      expect(await service.isProjectOffline('USER_A', '1', '100')).toBe(true);
    });

    it('returns false for an unmarked project or for another user', async () => {
      const { service } = createService();
      await service.markProjectOffline('USER_A', { codCli: '1', proyecto: '100', nomProy: 'Alpha', nomCliente: 'Acme' });

      expect(await service.isProjectOffline('USER_A', '2', '200')).toBe(false);
      expect(await service.isProjectOffline('USER_B', '1', '100')).toBe(false);
    });
  });

  describe('setOfflineProjectStatus', () => {
    it('updates only the status of an existing selection, keeping the rest', async () => {
      const { service } = createService();
      const marked = await service.markProjectOffline('USER_A', { codCli: '1', proyecto: '100', nomProy: 'Alpha', nomCliente: 'Acme' });

      await service.setOfflineProjectStatus('USER_A', '1', '100', 'sincronizado');

      const selections = await service.getOfflineProjectSelections('USER_A');
      expect(selections).toHaveLength(1);
      expect(selections[0]).toEqual({
        codCli: '1',
        proyecto: '100',
        nomProy: 'Alpha',
        nomCliente: 'Acme',
        status: 'sincronizado',
        markedAt: marked.markedAt,
      });
    });

    it('does not throw and changes nothing when the selection does not exist', async () => {
      const { service } = createService();

      await expect(service.setOfflineProjectStatus('USER_A', '1', '100', 'sincronizado')).resolves.toBeUndefined();
      expect(await service.getOfflineProjectSelections('USER_A')).toEqual([]);
    });
  });

  describe('removeProjectOffline', () => {
    it('removes the selection and the cached tree of that project', async () => {
      const { storage, service } = createService();
      await service.markProjectOffline('USER_A', { codCli: '1', proyecto: '100', nomProy: 'Alpha', nomCliente: 'Acme' });
      await storage.saveProjectTree('USER_A', '1', '100', TREE);

      await service.removeProjectOffline('USER_A', '1', '100');

      expect(await service.getOfflineProjectSelections('USER_A')).toEqual([]);
      expect(await storage.getProjectTree('USER_A', '1', '100')).toBeNull();
    });

    it('removes only that project for that user, keeping other projects and users intact', async () => {
      const { storage, service } = createService();
      await service.markProjectOffline('USER_A', { codCli: '1', proyecto: '100', nomProy: 'Alpha', nomCliente: 'Acme' });
      await service.markProjectOffline('USER_A', { codCli: '2', proyecto: '200', nomProy: 'Beta', nomCliente: 'Corp' });
      await service.markProjectOffline('USER_B', { codCli: '1', proyecto: '100', nomProy: 'Alpha', nomCliente: 'Acme' });
      await storage.saveProjectTree('USER_A', '1', '100', TREE);
      await storage.saveProjectTree('USER_B', '1', '100', TREE);

      await service.removeProjectOffline('USER_A', '1', '100');

      const a = await service.getOfflineProjectSelections('USER_A');
      expect(a).toHaveLength(1);
      expect(a[0].proyecto).toBe('200');
      expect(await storage.getProjectTree('USER_A', '1', '100')).toBeNull();
      expect(await service.isProjectOffline('USER_B', '1', '100')).toBe(true);
      expect(await storage.getProjectTree('USER_B', '1', '100')).toEqual(TREE);
    });

    it('does not throw when there is no cached tree for the project', async () => {
      const { service } = createService();
      await service.markProjectOffline('USER_A', { codCli: '1', proyecto: '100', nomProy: 'Alpha', nomCliente: 'Acme' });

      await expect(service.removeProjectOffline('USER_A', '1', '100')).resolves.toBeUndefined();
      expect(await service.getOfflineProjectSelections('USER_A')).toEqual([]);
    });
  });
});
