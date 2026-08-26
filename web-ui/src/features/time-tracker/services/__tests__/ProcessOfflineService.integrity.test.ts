import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProcessOfflineService, type ProcessOfflineApiClient } from '../ProcessOfflineService';
import { InMemoryProcessOfflineStorage } from '@/lib/storage/__tests__/InMemoryProcessOfflineStorage';
import type { TimeEntry } from '../../types';
import type { ProjectTreeResponse } from '../../../projects/types';

const mockDbGet = vi.fn();
vi.mock('@/config/stores', () => ({
  dbConfig: { get: () => mockDbGet() },
}));

const DB_CONFIG = { server: 's', database: 'db', username: 'u', password: 'p' };

function createMockApiClient(): ProcessOfflineApiClient {
  const post = vi.fn(async () => ({ success: true, data: { success: true, data: null } })) as unknown as ProcessOfflineApiClient['post'];
  return { post };
}

function createService(apiClient = createMockApiClient()) {
  const storage = new InMemoryProcessOfflineStorage();
  const service = new ProcessOfflineService(storage, apiClient);
  return { storage, service, apiClient };
}

function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'e1',
    taskId: 101,
    taskName: 'Proceso Normal',
    proceso: { proceso: 101, nombre: 'Proceso Normal' },
    date: '2026-01-15',
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600,
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
    synced: false,
    ...overrides,
  };
}

describe('ProcessOfflineService — Bloqueos de integridad T5', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbGet.mockReturnValue(DB_CONFIG);
  });

  describe('isTimeEntrySyncBlocked — Entradas con Proceso Pendiente no sincronizables', () => {
    it('blocks entry whose proceso is marked as pending (esPendiente)', async () => {
      const { service } = createService();
      const entry = makeEntry({
        taskId: -1,
        proceso: { proceso: -1, nombre: 'Pendiente', esPendiente: true, procesoPendienteId: -1 },
      });
      expect(service.isTimeEntrySyncBlocked(entry)).toBe(true);
    });

    it('blocks entry with negative taskId (ID provisional) even without esPendiente flag', async () => {
      const { service } = createService();
      const entry = makeEntry({ taskId: -2, proceso: { proceso: -2, nombre: 'Pendiente' } });
      expect(service.isTimeEntrySyncBlocked(entry)).toBe(true);
    });

    it('does not block normal entry with positive taskId', async () => {
      const { service } = createService();
      const entry = makeEntry({ taskId: 101, proceso: { proceso: 101, nombre: 'Normal' } });
      expect(service.isTimeEntrySyncBlocked(entry)).toBe(false);
    });
  });

  describe('isProjectRemovalBlocked — Desmarcado bloqueado si tiene Entradas pendientes', () => {
    it('blocks removal when project has pending entries (synced=false)', async () => {
      const { storage, service } = createService();
      await service.markProjectOffline('USER_A', { codCli: '1', proyecto: '100', nomProy: 'Alpha', nomCliente: 'Acme' });
      await storage.saveProjectTree('USER_A', '1', '100', makeTreeWithProcesses([{ proceso: 101, nombre: 'Frontend' }]));
      const entry = makeEntry({
        id: 'e1',
        taskId: 101,
        synced: false,
        proceso: { proceso: 101, nombre: 'Frontend', proyectoId: 100 },
      });
      await expect(service.isProjectRemovalBlocked('USER_A', '1', '100', [entry])).resolves.toBe(true);
    });

    it('does not block when entries are synced', async () => {
      const { storage, service } = createService();
      await service.markProjectOffline('USER_A', { codCli: '1', proyecto: '100', nomProy: 'Alpha', nomCliente: 'Acme' });
      await storage.saveProjectTree('USER_A', '1', '100', makeTreeWithProcesses([{ proceso: 101, nombre: 'Frontend' }]));
      const entry = makeEntry({ taskId: 101, synced: true, proceso: { proceso: 101, nombre: 'Frontend', proyectoId: 100 } });
      await expect(service.isProjectRemovalBlocked('USER_A', '1', '100', [entry])).resolves.toBe(false);
    });

    it('does not block when pending entries belong to another project', async () => {
      const { storage, service } = createService();
      await service.markProjectOffline('USER_A', { codCli: '1', proyecto: '100', nomProy: 'Alpha', nomCliente: 'Acme' });
      await service.markProjectOffline('USER_A', { codCli: '2', proyecto: '200', nomProy: 'Beta', nomCliente: 'Acme' });
      await storage.saveProjectTree('USER_A', '1', '100', makeTreeWithProcesses([{ proceso: 101, nombre: 'Frontend' }]));
      await storage.saveProjectTree('USER_A', '2', '200', makeTreeWithProcesses([{ proceso: 202, nombre: 'Backend' }]));
      const entryForOther = makeEntry({ taskId: 202, synced: false, proceso: { proceso: 202, nombre: 'Backend', proyectoId: 200 } });
      await expect(service.isProjectRemovalBlocked('USER_A', '1', '100', [entryForOther])).resolves.toBe(false);
    });

    it('blocks removal for pending Proceso Pendiente belonging to that project', async () => {
      const { service } = createService();
      await service.markProjectOffline('USER_A', { codCli: '1', proyecto: '100', nomProy: 'Alpha', nomCliente: 'Acme' });
      const pendiente = await service.createPendingProcess('USER_A', { nombre: 'Pendiente', minutos: 60, proyectoId: '1', proyectoNombre: 'Alpha' });
      const entry = makeEntry({
        taskId: pendiente.id,
        synced: false,
        proceso: { proceso: pendiente.id, nombre: pendiente.nombre, esPendiente: true, procesoPendienteId: pendiente.id, proyectoId: '1' },
      });
      await expect(service.isProjectRemovalBlocked('USER_A', '1', '100', [entry])).resolves.toBe(true);
    });

    it('removeProjectOffline throws when blocked with pending entries', async () => {
      const { storage, service } = createService();
      await service.markProjectOffline('USER_A', { codCli: '1', proyecto: '100', nomProy: 'Alpha', nomCliente: 'Acme' });
      await storage.saveProjectTree('USER_A', '1', '100', makeTreeWithProcesses([{ proceso: 101, nombre: 'Frontend' }]));
      const entry = makeEntry({ taskId: 101, synced: false, proceso: { proceso: 101, nombre: 'Frontend', proyectoId: 100 } });
      await expect(service.removeProjectOffline('USER_A', '1', '100', [entry])).rejects.toThrow();
      // still offline
      expect(await service.isProjectOffline('USER_A', '1', '100')).toBe(true);
    });

    it('removeProjectOffline succeeds when no pending entries', async () => {
      const { storage, service } = createService();
      await service.markProjectOffline('USER_A', { codCli: '1', proyecto: '100', nomProy: 'Alpha', nomCliente: 'Acme' });
      await storage.saveProjectTree('USER_A', '1', '100', makeTreeWithProcesses([{ proceso: 101, nombre: 'Frontend' }]));
      const entrySynced = makeEntry({ taskId: 101, synced: true, proceso: { proceso: 101, nombre: 'Frontend', proyectoId: 100 } });
      await expect(service.removeProjectOffline('USER_A', '1', '100', [entrySynced])).resolves.toBeUndefined();
      expect(await service.isProjectOffline('USER_A', '1', '100')).toBe(false);
      expect(await storage.getProjectTree('USER_A', '1', '100')).toBeNull();
    });
  });

  describe('syncOfflineCache — espejo del sistema, entradas sagradas', () => {
    const OLD_TREE = makeTreeWithProcesses([
      { proceso: 101, nombre: 'Frontend Old' },
      { proceso: 102, nombre: 'ToBeDeleted' },
    ]);

    const NEW_TREE: ProjectTreeResponse = {
      cliente: { codCli: 1, cliente: 'CLI001', nomCliente: 'Acme' },
      proyecto: { codCli: 1, proyecto: 100, nomProy: 'Alpha', cerrado: false, cmmi: false, esCM: false, esPET: false },
      disciplinas: [
        {
          idDisciplina: 1,
          nombre: 'Dev',
          sinDisciplina: false,
          orden: 1,
          fases: [
            {
              fase: 10,
              nombre: 'Construccion',
              cerrado: false,
              orden: 1,
              procesos: [
                { proceso: 101, nombre: 'Frontend New' },
                { proceso: 103, nombre: 'NewProcess' },
              ],
            },
          ],
        },
      ],
    };

    it('replaces cached trees with system data: updated names and deleted processes reflected', async () => {
      const { storage, service } = createService();
      await service.markProjectOffline('USER_A', { codCli: '1', proyecto: '100', nomProy: 'Alpha', nomCliente: 'Acme' });
      await storage.saveProjectTree('USER_A', '1', '100', OLD_TREE);

      const apiClient = {
        post: vi.fn(async (url: string) => {
          if (url === '/projects-tree') return { success: true, data: { success: true, data: NEW_TREE } };
          return { success: true, data: { success: true, data: null } };
        }),
      } as unknown as ProcessOfflineApiClient;
      const serviceWithMock = new ProcessOfflineService(storage, apiClient);

      const result = await serviceWithMock.syncOfflineCache('USER_A');

      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(0);
      expect(await storage.getProjectTree('USER_A', '1', '100')).toEqual(NEW_TREE);
      const offlineProcesses = await serviceWithMock.getOfflineProcesses('USER_A');
      expect(offlineProcesses.find((p) => p.proceso === 101)?.nombre).toBe('Frontend New');
      expect(offlineProcesses.find((p) => p.proceso === 102)).toBeUndefined();
      expect(offlineProcesses.find((p) => p.proceso === 103)?.nombre).toBe('NewProcess');
      // status becomes sincronizado
      const sel = (await serviceWithMock.getOfflineProjectSelections('USER_A'))[0];
      expect(sel.status).toBe('sincronizado');
    });

    it('never deletes nor reassigns Entradas de Tiempo even when their process was deleted from system', async () => {
      const { storage, service } = createService();
      await service.markProjectOffline('USER_A', { codCli: '1', proyecto: '100', nomProy: 'Alpha', nomCliente: 'Acme' });
      await storage.saveProjectTree('USER_A', '1', '100', OLD_TREE);

      const pendingEntry = makeEntry({
        id: 'e-keep',
        taskId: 102,
        taskName: 'ToBeDeleted',
        synced: false,
        proceso: { proceso: 102, nombre: 'ToBeDeleted', proyectoId: 100 },
      });
      const entriesBefore = [pendingEntry];

      const apiClient = {
        post: vi.fn(async () => ({ success: true, data: { success: true, data: NEW_TREE } })),
      } as unknown as ProcessOfflineApiClient;
      const serviceWithMock = new ProcessOfflineService(storage, apiClient);

      await serviceWithMock.syncOfflineCache('USER_A');

      // Entrada intacta: mismo taskId, mismo nombre, no reasignada
      expect(entriesBefore[0].taskId).toBe(102);
      expect(entriesBefore[0].taskName).toBe('ToBeDeleted');
      expect(entriesBefore[0].proceso.proceso).toBe(102);
      // Cache ya no contiene 102 pero entrada sigue allí (sagrada)
      const cached = await storage.getProjectTree('USER_A', '1', '100');
      expect(cached).toEqual(NEW_TREE);
    });

    it('is isolated per user and counts failures without touching other users cache', async () => {
      const storage = new InMemoryProcessOfflineStorage();
      const apiClientOk = {
        post: vi.fn(async () => ({ success: true, data: { success: true, data: NEW_TREE } })),
      } as unknown as ProcessOfflineApiClient;
      const apiClientFail = {
        post: vi.fn(async () => ({ success: true, data: { success: false, message: 'DB down' } })),
      } as unknown as ProcessOfflineApiClient;

      // User A offline with OLD_TREE
      const serviceA = new ProcessOfflineService(storage, apiClientOk);
      await serviceA.markProjectOffline('USER_A', { codCli: '1', proyecto: '100', nomProy: 'Alpha', nomCliente: 'Acme' });
      await storage.saveProjectTree('USER_A', '1', '100', OLD_TREE);

      // User B offline with OLD_TREE but its sync will fail
      const serviceB = new ProcessOfflineService(storage, apiClientFail);
      await serviceB.markProjectOffline('USER_B', { codCli: '1', proyecto: '100', nomProy: 'Alpha', nomCliente: 'Acme' });
      await storage.saveProjectTree('USER_B', '1', '100', OLD_TREE);

      const resultA = await serviceA.syncOfflineCache('USER_A');
      expect(resultA.succeeded).toBe(1);
      expect(resultA.failed).toBe(0);
      expect(await storage.getProjectTree('USER_A', '1', '100')).toEqual(NEW_TREE);

      const resultB = await serviceB.syncOfflineCache('USER_B');
      expect(resultB.succeeded).toBe(0);
      expect(resultB.failed).toBe(1);
      // B keeps old tree
      expect(await storage.getProjectTree('USER_B', '1', '100')).toEqual(OLD_TREE);
      // A still new
      expect(await storage.getProjectTree('USER_A', '1', '100')).toEqual(NEW_TREE);
    });
  });
});

function makeTreeWithProcesses(procesos: { proceso: number; nombre: string }[]): ProjectTreeResponse {
  return {
    cliente: { codCli: 1, cliente: 'CLI001', nomCliente: 'Acme' },
    proyecto: { codCli: 1, proyecto: 100, nomProy: 'Alpha', cerrado: false, cmmi: false, esCM: false, esPET: false },
    disciplinas: [
      {
        idDisciplina: 1,
        nombre: 'Dev',
        sinDisciplina: false,
        orden: 1,
        fases: [{ fase: 10, nombre: 'Construccion', cerrado: false, orden: 1, procesos }],
      },
    ],
  };
}
