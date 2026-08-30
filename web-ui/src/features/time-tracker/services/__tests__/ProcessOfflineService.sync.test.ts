import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProcessOfflineService, type ProcessOfflineApiClient } from '../ProcessOfflineService';
import { InMemoryProcessOfflineStorage } from '@/lib/storage/__tests__/InMemoryProcessOfflineStorage';
import type { Proceso } from '../../types';

const mockDbGet = vi.fn();
vi.mock('@/config/stores', () => ({
  dbConfig: { get: () => mockDbGet() },
}));

const DB_CONFIG = { server: 's', database: 'db', username: 'u', password: 'p' };

const SYSTEM_PROCESOS: Proceso[] = [
  { proceso: 101, nombre: 'Alpha' },
  { proceso: 102, nombre: 'Beta' },
  { proceso: 103, nombre: 'Proceso Duplicado' },
];

function createStorage() {
  return new InMemoryProcessOfflineStorage();
}

function createMockApi(systemProcesos: Proceso[], createBehavior?: (dto: { nombre: string }) => { success: boolean; nProceso?: number; message?: string }) {
  let createdCounter = 200;
  const post = vi.fn(async (url: string, data: unknown) => {
    if (url === '/processes') {
      return { success: true, data: { success: true, data: systemProcesos } };
    }
    if (url === '/create-process') {
      const dto = (data as { dto: { nombre: string } }).dto;
      if (createBehavior) {
        const res = createBehavior(dto);
        if (!res.success) return { success: true, data: { success: false, message: res.message } } as never;
        // Simulate server success with nProceso
        return { success: true, data: { success: true, nProceso: res.nProceso ?? ++createdCounter } } as never;
      }
      const nProceso = ++createdCounter;
      systemProcesos.push({ proceso: nProceso, nombre: dto.nombre });
      return { success: true, data: { success: true, nProceso } } as never;
    }
    throw new Error(`Unexpected URL ${url}`);
  }) as unknown as ProcessOfflineApiClient['post'];
  return { post, systemProcesos };
}

describe('ProcessOfflineService — Sync de Procesos T6', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbGet.mockReturnValue(DB_CONFIG);
  });

  describe('planProcessSync', () => {
    it('returns pull/push/duplicates correctly', async () => {
      const storage = createStorage();
      const api = createMockApi([...SYSTEM_PROCESOS]);
      const service = new ProcessOfflineService(storage, { post: api.post });

      await storage.saveProcesses('U1', [{ proceso: 101, nombre: 'Alpha' }]);
      await storage.putPendingProcess('U1', { id: -1, nombre: 'Proceso Duplicado', minutos: 60, createdAt: 1, updatedAt: 1 });
      await storage.putPendingProcess('U1', { id: -2, nombre: 'Nuevo Local', minutos: 30, faseId: 10, createdAt: 1, updatedAt: 1 });

      const plan = await service.planProcessSync('U1');
      // pull = Beta only (102) because 101 cached and 103 duplicate excluded
      expect(plan.pull.map((p) => p.proceso)).toEqual([102]);
      expect(plan.push.map((p) => p.id)).toEqual([-2]);
      expect(plan.duplicates).toHaveLength(1);
      expect(plan.duplicates[0].pending.id).toBe(-1);
    });
  });

  describe('syncProcesses', () => {
    it('crea pendientes, remapea entradas, actualiza timestamp y elimina pendientes', async () => {
      const storage = createStorage();
      const system = [{ proceso: 10, nombre: 'Existente' }];
      const api = createMockApi([...system]);
      const service = new ProcessOfflineService(storage, { post: api.post });

      const pendiente = await service.createPendingProcess('U1', { nombre: 'Nuevo Proceso', minutos: 60, faseId: 5, proyectoId: '1', proyectoNombre: 'P1' });
      // Entrada vinculada al pendiente
      await storage.putTimeEntry({
        id: 'e1',
        taskId: pendiente.id,
        taskName: pendiente.nombre,
        proceso: { proceso: pendiente.id, nombre: pendiente.nombre, esPendiente: true, procesoPendienteId: pendiente.id },
        date: '2026-01-10',
        startTime: '09:00',
        endTime: '10:00',
        duration: 3600,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        synced: false,
      });

      const result = await service.syncProcesses('U1', {});
      expect(result.created.succeeded).toBe(1);
      expect(result.created.failed).toBe(0);
      expect(result.remappedEntries).toBe(1);
      expect(result.failedIds).toEqual([]);
      expect(await storage.getPendingProcesses('U1')).toEqual([]);
      const entries = await storage.getTimeEntries();
      expect(entries[0].taskId).toBeGreaterThan(0);
      expect(entries[0].taskName).toBe('Nuevo Proceso');
      expect(entries[0].proceso.esPendiente).toBe(false);
      expect(result.lastUpdated).not.toBeNull();
    });

    it('duplicado "usar el existente" remapea sin crear en BBDD', async () => {
      const storage = createStorage();
      const system = [{ proceso: 999, nombre: 'Proceso Duplicado' }];
      const api = createMockApi([...system]);
      // Ensure create not called
      const service = new ProcessOfflineService(storage, { post: api.post });

      const pendiente = await service.createPendingProcess('U1', { nombre: 'Proceso Duplicado', minutos: 60, faseId: 5 });
      await storage.putTimeEntry({
        id: 'e2',
        taskId: pendiente.id,
        taskName: pendiente.nombre,
        proceso: { proceso: pendiente.id, nombre: pendiente.nombre, esPendiente: true, procesoPendienteId: pendiente.id },
        date: '2026-01-10',
        startTime: '09:00',
        endTime: '10:00',
        duration: 3600,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        synced: false,
      });

      const result = await service.syncProcesses('U1', { duplicateResolutions: { [pendiente.id]: 'useExisting' } });
      expect(result.remappedDuplicates).toBe(1);
      expect(result.created.succeeded).toBe(0);
      expect(api.post).not.toHaveBeenCalledWith('/create-process', expect.anything());
      const entries = await storage.getTimeEntries();
      expect(entries[0].taskId).toBe(999);
      expect(await storage.getPendingProcesses('U1')).toEqual([]);
    });

    it('fallo parcial: 3/4 creados 1 falló y reintento quirúrgico solo lo fallado', async () => {
      const storage = createStorage();
      const system: Proceso[] = [];
      const api = createMockApi([...system], (dto) => {
        if (dto.nombre === 'Falla') return { success: false, message: 'DB error' };
        return { success: true, nProceso: Math.floor(Math.random() * 1000) + 1000 };
      });
      const service = new ProcessOfflineService(storage, { post: api.post });

      const p1 = await service.createPendingProcess('U1', { nombre: 'Ok1', minutos: 60, faseId: 1 });
      const p2 = await service.createPendingProcess('U1', { nombre: 'Falla', minutos: 60, faseId: 1 });
      const p3 = await service.createPendingProcess('U1', { nombre: 'Ok2', minutos: 60, faseId: 1 });
      const p4 = await service.createPendingProcess('U1', { nombre: 'Ok3', minutos: 60, faseId: 1 });

      const first = await service.syncProcesses('U1', {});
      expect(first.created.succeeded).toBe(3);
      expect(first.created.failed).toBe(1);
      expect(first.failedIds).toEqual([p2.id]);
      expect(first.created.failures[0].pendingId).toBe(p2.id);
      // 3 pendientes eliminados, 1 permanece
      expect((await storage.getPendingProcesses('U1')).map((p) => p.id)).toEqual([p2.id]);

      // Reintento quirúrgico: mock ahora succeed para el fallado
      const api2 = createMockApi([...system], () => ({ success: true, nProceso: 5555 }));
      const service2 = new ProcessOfflineService(storage, { post: api2.post });
      const retry = await service2.syncProcesses('U1', { retryFailedIds: first.failedIds });
      expect(retry.created.succeeded).toBe(1);
      expect(retry.created.failed).toBe(0);
      expect(await storage.getPendingProcesses('U1')).toEqual([]);
    });

    it('progreso por etapas se reporta', async () => {
      const storage = createStorage();
      const system = [{ proceso: 1, nombre: 'Existing' }];
      const api = createMockApi([...system]);
      const service = new ProcessOfflineService(storage, { post: api.post });
      await service.createPendingProcess('U1', { nombre: 'A', minutos: 60, faseId: 1 });
      await service.createPendingProcess('U1', { nombre: 'B', minutos: 60, faseId: 1 });

      const progresses: { stage: string }[] = [];
      await service.syncProcesses('U1', {}, (p) => progresses.push(p));
      const stages = progresses.map((p) => p.stage);
      expect(stages).toContain('push');
      expect(stages).toContain('done');
    });
  });
});
