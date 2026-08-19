import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IndexedDBProcessOfflineStorage } from '../IndexedDBProcessOfflineStorage';
import { db } from '../IndexedDBStorage';
import type { OfflineProjectSelection, ProcesoPendiente } from '../../../features/time-tracker/types';
import type { ProjectTreeResponse } from '../../../features/projects/types';

const DB_NAME = 'TimeTrackerDB';

function deleteDB() {
  return new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

const SELECTION_A: OfflineProjectSelection = {
  codCli: '1',
  proyecto: '100',
  nomProy: 'Proyecto Alpha',
  nomCliente: 'Acme Corp',
  status: 'pendiente',
  markedAt: 1000,
};

const SELECTION_B: OfflineProjectSelection = {
  codCli: '2',
  proyecto: '200',
  nomProy: 'Proyecto Beta',
  nomCliente: 'Beta Corp',
  status: 'sincronizado',
  markedAt: 2000,
};

const PENDIENTE_A: ProcesoPendiente = {
  id: -1,
  nombre: 'Proceso Uno',
  faseId: 10,
  faseNombre: 'Fase Construccion',
  proyectoId: '1',
  proyectoNombre: 'Proyecto Alpha',
  clienteId: 'CLI001',
  clienteNombre: 'Acme Corp',
  minutos: 60,
  fechaInicio: '2026-01-01',
  fechaFin: '2026-01-31',
  fechaEstimacion: '2026-02-15',
  createdAt: 1000,
  updatedAt: 1000,
};

const PENDIENTE_B: ProcesoPendiente = {
  id: -2,
  nombre: 'Proceso Dos',
  minutos: 30,
  createdAt: 2000,
  updatedAt: 2000,
};

const TREE: ProjectTreeResponse = {
  cliente: { codCli: 1, cliente: 'CLI001', nomCliente: 'Acme Corp' },
  proyecto: { codCli: 1, proyecto: 100, nomProy: 'Proyecto Alpha', cerrado: false, cmmi: false, esCM: false, esPET: false },
  disciplinas: [],
};

describe('IndexedDBProcessOfflineStorage (v5)', () => {
  beforeEach(async () => {
    await deleteDB();
  });

  describe('offline project selections', () => {
    it('round-trips a saved selection per user', async () => {
      const storage = new IndexedDBProcessOfflineStorage();

      await storage.setOfflineProjectSelection('USER_A', SELECTION_A);

      expect(await storage.getOfflineProjectSelections('USER_A')).toEqual([SELECTION_A]);
    });

    it('persists rows in the offlineProjectSelections table with composite key', async () => {
      const storage = new IndexedDBProcessOfflineStorage();

      await storage.setOfflineProjectSelection('USER_A', SELECTION_A);

      const rows = await db.offlineProjectSelections.where('usured').equals('USER_A').toArray();
      expect(rows).toHaveLength(1);
      expect(rows[0].key).toBe('USER_A::1::100');
      expect(rows[0].selection).toEqual(SELECTION_A);
    });

    it('isolates selections per user', async () => {
      const storage = new IndexedDBProcessOfflineStorage();

      await storage.setOfflineProjectSelection('USER_A', SELECTION_A);
      await storage.setOfflineProjectSelection('USER_B', SELECTION_B);

      expect(await storage.getOfflineProjectSelections('USER_A')).toEqual([SELECTION_A]);
      expect(await storage.getOfflineProjectSelections('USER_B')).toEqual([SELECTION_B]);
    });

    it('replaces a selection on save with the same project key', async () => {
      const storage = new IndexedDBProcessOfflineStorage();

      await storage.setOfflineProjectSelection('USER_A', SELECTION_A);
      await storage.setOfflineProjectSelection('USER_A', { ...SELECTION_A, status: 'sincronizado', markedAt: 3000 });

      expect(await storage.getOfflineProjectSelections('USER_A')).toEqual([{ ...SELECTION_A, status: 'sincronizado', markedAt: 3000 }]);
    });

    it('removes only the requested selection of the requested user', async () => {
      const storage = new IndexedDBProcessOfflineStorage();
      await storage.setOfflineProjectSelection('USER_A', SELECTION_A);
      await storage.setOfflineProjectSelection('USER_A', SELECTION_B);
      await storage.setOfflineProjectSelection('USER_B', SELECTION_A);

      await storage.removeOfflineProjectSelection('USER_A', '1', '100');

      const a = await storage.getOfflineProjectSelections('USER_A');
      expect(a).toHaveLength(1);
      expect(a[0].proyecto).toBe('200');
      expect(await storage.getOfflineProjectSelections('USER_B')).toEqual([SELECTION_A]);
    });

    it('does not throw when removing a selection that does not exist', async () => {
      const storage = new IndexedDBProcessOfflineStorage();

      await expect(storage.removeOfflineProjectSelection('USER_A', '1', '100')).resolves.toBeUndefined();
    });
  });

  describe('pending processes', () => {
    it('round-trips a saved pending process per user', async () => {
      const storage = new IndexedDBProcessOfflineStorage();

      await storage.putPendingProcess('USER_A', PENDIENTE_A);

      expect(await storage.getPendingProcesses('USER_A')).toEqual([PENDIENTE_A]);
    });

    it('persists rows in the pendingProcesses table with composite key', async () => {
      const storage = new IndexedDBProcessOfflineStorage();

      await storage.putPendingProcess('USER_A', PENDIENTE_A);

      const rows = await db.pendingProcesses.where('usured').equals('USER_A').toArray();
      expect(rows).toHaveLength(1);
      expect(rows[0].key).toBe('USER_A::-1');
      expect(rows[0].pendiente).toEqual(PENDIENTE_A);
    });

    it('isolates pending processes per user', async () => {
      const storage = new IndexedDBProcessOfflineStorage();

      await storage.putPendingProcess('USER_A', PENDIENTE_A);
      await storage.putPendingProcess('USER_B', PENDIENTE_B);

      expect(await storage.getPendingProcesses('USER_A')).toEqual([PENDIENTE_A]);
      expect(await storage.getPendingProcesses('USER_B')).toEqual([PENDIENTE_B]);
    });

    it('allows the same id for different users', async () => {
      const storage = new IndexedDBProcessOfflineStorage();

      await storage.putPendingProcess('USER_A', PENDIENTE_A);
      await storage.putPendingProcess('USER_B', PENDIENTE_A);

      expect(await storage.getPendingProcesses('USER_A')).toEqual([PENDIENTE_A]);
      expect(await storage.getPendingProcesses('USER_B')).toEqual([PENDIENTE_A]);
    });

    it('replaces a pending process on save with the same id', async () => {
      const storage = new IndexedDBProcessOfflineStorage();

      await storage.putPendingProcess('USER_A', PENDIENTE_A);
      await storage.putPendingProcess('USER_A', { ...PENDIENTE_A, nombre: 'Renombrado', updatedAt: 3000 });

      expect(await storage.getPendingProcesses('USER_A')).toEqual([{ ...PENDIENTE_A, nombre: 'Renombrado', updatedAt: 3000 }]);
    });

    it('removes only the pending process with the requested id of the requested user', async () => {
      const storage = new IndexedDBProcessOfflineStorage();
      await storage.putPendingProcess('USER_A', PENDIENTE_A);
      await storage.putPendingProcess('USER_A', PENDIENTE_B);
      await storage.putPendingProcess('USER_B', PENDIENTE_A);

      await storage.removePendingProcess('USER_A', -1);

      const a = await storage.getPendingProcesses('USER_A');
      expect(a).toHaveLength(1);
      expect(a[0].id).toBe(-2);
      expect(await storage.getPendingProcesses('USER_B')).toEqual([PENDIENTE_A]);
    });

    it('does not throw when removing a pending process that does not exist', async () => {
      const storage = new IndexedDBProcessOfflineStorage();

      await expect(storage.removePendingProcess('USER_A', -99)).resolves.toBeUndefined();
    });
  });

  describe('removeProjectTree', () => {
    it('removes the cached tree of a project', async () => {
      const storage = new IndexedDBProcessOfflineStorage();
      await storage.saveProjectTree('USER_A', '1', '100', TREE);

      await storage.removeProjectTree('USER_A', '1', '100');

      expect(await storage.getProjectTree('USER_A', '1', '100')).toBeNull();
    });

    it('removes only the tree of the requested user + project key', async () => {
      const storage = new IndexedDBProcessOfflineStorage();
      await storage.saveProjectTree('USER_A', '1', '100', TREE);
      await storage.saveProjectTree('USER_B', '1', '100', TREE);
      await storage.saveProjectTree('USER_A', '2', '200', TREE);

      await storage.removeProjectTree('USER_A', '1', '100');

      expect(await storage.getProjectTree('USER_A', '1', '100')).toBeNull();
      expect(await storage.getProjectTree('USER_B', '1', '100')).toEqual(TREE);
      expect(await storage.getProjectTree('USER_A', '2', '200')).toEqual(TREE);
    });

    it('does not throw when the tree does not exist', async () => {
      const storage = new IndexedDBProcessOfflineStorage();

      await expect(storage.removeProjectTree('USER_A', '1', '100')).resolves.toBeUndefined();
    });
  });
});
