import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProcessOfflineService, type ProcessOfflineApiClient } from '../ProcessOfflineService';
import { InMemoryProcessOfflineStorage } from '@/lib/storage/__tests__/InMemoryProcessOfflineStorage';

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

describe('ProcessOfflineService — Procesos Pendientes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbGet.mockReturnValue(DB_CONFIG);
  });

  describe('createPendingProcess', () => {
    it('assigns sequential negative ids (-1, -2, ...) and persists createdAt/updatedAt', async () => {
      const { service } = createService();

      const first = await service.createPendingProcess('USER_A', { nombre: 'Proceso Uno', minutos: 60 });
      const second = await service.createPendingProcess('USER_A', { nombre: 'Proceso Dos', minutos: 120 });

      expect(first.id).toBe(-1);
      expect(second.id).toBe(-2);
      expect(first.createdAt).toBeGreaterThan(0);
      expect(first.updatedAt).toBe(first.createdAt);
      expect(second.createdAt).toBeGreaterThanOrEqual(first.createdAt);

      const all = await service.getPendingProcesses('USER_A');
      expect(all).toHaveLength(2);
      expect(all.map((p) => p.id)).toEqual([-2, -1]);
    });

    it('persists all input fields', async () => {
      const { service } = createService();

      const pendiente = await service.createPendingProcess('USER_A', {
        nombre: 'Proceso Completo',
        faseId: 10,
        faseNombre: 'Fase Construccion',
        proyectoId: '1',
        proyectoNombre: 'Proyecto Alpha',
        clienteId: 'CLI001',
        clienteNombre: 'Acme Corp',
        minutos: 90,
        fechaInicio: '2026-01-01',
        fechaFin: '2026-01-31',
        fechaEstimacion: '2026-02-15',
      });

      expect((await service.getPendingProcesses('USER_A'))[0]).toEqual(pendiente);
    });

    it('does not mix ids between users (each user starts at -1)', async () => {
      const { service } = createService();

      await service.createPendingProcess('USER_A', { nombre: 'A1', minutos: 30 });
      const b1 = await service.createPendingProcess('USER_B', { nombre: 'B1', minutos: 30 });

      expect(b1.id).toBe(-1);
      expect((await service.getPendingProcesses('USER_A'))[0].id).toBe(-1);
    });
  });

  describe('getPendingProcesses', () => {
    it('returns only the pending processes of the user', async () => {
      const { service } = createService();

      await service.createPendingProcess('USER_A', { nombre: 'A1', minutos: 30 });
      await service.createPendingProcess('USER_B', { nombre: 'B1', minutos: 30 });
      await service.createPendingProcess('USER_A', { nombre: 'A2', minutos: 45 });

      const a = await service.getPendingProcesses('USER_A');
      expect(a).toHaveLength(2);
      expect(a.map((p) => p.nombre)).toEqual(['A2', 'A1']);

      const b = await service.getPendingProcesses('USER_B');
      expect(b.map((p) => p.nombre)).toEqual(['B1']);
    });
  });

  describe('updatePendingProcess', () => {
    it('merges the patch, bumps updatedAt and keeps id/createdAt', async () => {
      const { service } = createService();
      const created = await service.createPendingProcess('USER_A', { nombre: 'Original', minutos: 60 });

      const updated = await service.updatePendingProcess('USER_A', created.id, { nombre: 'Renombrado', minutos: 75 });

      expect(updated).not.toBeNull();
      expect(updated!.id).toBe(created.id);
      expect(updated!.nombre).toBe('Renombrado');
      expect(updated!.minutos).toBe(75);
      expect(updated!.createdAt).toBe(created.createdAt);
      expect(updated!.updatedAt).toBeGreaterThanOrEqual(created.updatedAt);

      const stored = (await service.getPendingProcesses('USER_A')).find((p) => p.id === created.id)!;
      expect(stored).toEqual(updated);
    });

    it('returns null when the id does not exist', async () => {
      const { service } = createService();

      await expect(service.updatePendingProcess('USER_A', -99, { nombre: 'X' })).resolves.toBeNull();
    });
  });

  describe('deletePendingProcess', () => {
    it('removes the pending process', async () => {
      const { service } = createService();
      const created = await service.createPendingProcess('USER_A', { nombre: 'Borrar', minutos: 60 });

      await service.deletePendingProcess('USER_A', created.id);

      expect(await service.getPendingProcesses('USER_A')).toEqual([]);
    });

    it('is a no-op when the id does not exist', async () => {
      const { service } = createService();

      await expect(service.deletePendingProcess('USER_A', -99)).resolves.toBeUndefined();
    });
  });

  describe('getPendingProcessesAsProcesos', () => {
    it('converts pending processes to Proceso with esPendiente and negative proceso id', async () => {
      const { service } = createService();
      const created = await service.createPendingProcess('USER_A', {
        nombre: 'Proceso Pendiente',
        faseId: 10,
        faseNombre: 'Fase Construccion',
        proyectoId: '1',
        proyectoNombre: 'Proyecto Alpha',
        clienteId: 'CLI001',
        clienteNombre: 'Acme Corp',
        minutos: 60,
      });

      const procesos = await service.getPendingProcessesAsProcesos('USER_A');

      expect(procesos).toHaveLength(1);
      expect(procesos[0]).toEqual({
        proceso: created.id,
        nombre: 'Proceso Pendiente',
        faseId: 10,
        faseNombre: 'Fase Construccion',
        proyectoId: '1',
        proyectoNombre: 'Proyecto Alpha',
        clienteId: 'CLI001',
        clienteNombre: 'Acme Corp',
        esPendiente: true,
        procesoPendienteId: created.id,
      });
    });

    it('returns only the pending processes of the user', async () => {
      const { service } = createService();

      await service.createPendingProcess('USER_A', { nombre: 'A1', minutos: 30 });
      await service.createPendingProcess('USER_B', { nombre: 'B1', minutos: 30 });

      const procesos = await service.getPendingProcessesAsProcesos('USER_A');
      expect(procesos.map((p) => p.nombre)).toEqual(['A1']);
    });
  });
});
