import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IndexedDBProcessOfflineStorage } from '../IndexedDBProcessOfflineStorage';
import { db } from '../IndexedDBStorage';
import type { Proceso } from '../../../features/time-tracker/types';
import type { Project, ProjectTreeResponse } from '../../../features/projects/types';

const DB_NAME = 'TimeTrackerDB';

function deleteDB() {
  return new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

const PROCESOS_A: Proceso[] = [
  { proceso: 101, nombre: 'Desarrollo Frontend', faseNombre: 'Fase Construccion' },
  { proceso: 102, nombre: 'Desarrollo Backend', faseNombre: 'Fase Construccion' },
];

const PROCESOS_B: Proceso[] = [{ proceso: 201, nombre: 'Testing Unitario', faseNombre: 'Fase Testing' }];

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
          procesos: [{ proceso: 101, nombre: 'Desarrollo Frontend' }],
        },
      ],
    },
  ],
};

describe('IndexedDBProcessOfflineStorage', () => {
  beforeEach(async () => {
    await deleteDB();
  });

  describe('processes', () => {
    it('round-trips saved processes per user', async () => {
      const storage = new IndexedDBProcessOfflineStorage();

      await storage.saveProcesses('USER_A', PROCESOS_A);

      expect(await storage.getProcesses('USER_A')).toEqual(PROCESOS_A);
    });

    it('persists rows in the offlineProcesses table', async () => {
      const storage = new IndexedDBProcessOfflineStorage();

      await storage.saveProcesses('USER_A', PROCESOS_A);

      const rows = await db.offlineProcesses.where('usured').equals('USER_A').toArray();
      expect(rows).toHaveLength(2);
      expect(rows[0].key).toBe(`USER_A::${rows[0].proceso.proceso}`);
    });

    it('returns empty array for a user with no cache', async () => {
      const storage = new IndexedDBProcessOfflineStorage();

      expect(await storage.getProcesses('USER_A')).toEqual([]);
    });

    it('keeps each user cache isolated', async () => {
      const storage = new IndexedDBProcessOfflineStorage();

      await storage.saveProcesses('USER_A', PROCESOS_A);
      await storage.saveProcesses('USER_B', PROCESOS_B);

      expect(await storage.getProcesses('USER_A')).toEqual(PROCESOS_A);
      expect(await storage.getProcesses('USER_B')).toEqual(PROCESOS_B);
    });

    it('replaces the cache of a user on save (no leftovers from previous data)', async () => {
      const storage = new IndexedDBProcessOfflineStorage();

      await storage.saveProcesses('USER_A', PROCESOS_A);
      await storage.saveProcesses('USER_A', [PROCESOS_A[0]]);

      expect(await storage.getProcesses('USER_A')).toEqual([PROCESOS_A[0]]);
    });

    it('survives across storage instances (same underlying DB)', async () => {
      const writer = new IndexedDBProcessOfflineStorage();
      await writer.saveProcesses('USER_A', PROCESOS_A);

      const reader = new IndexedDBProcessOfflineStorage();
      expect(await reader.getProcesses('USER_A')).toEqual(PROCESOS_A);
    });
  });

  describe('projects', () => {
    it('round-trips saved projects per user', async () => {
      const storage = new IndexedDBProcessOfflineStorage();

      await storage.saveProjects('USER_A', PROJECTS);

      expect(await storage.getProjects('USER_A')).toEqual(PROJECTS);
    });

    it('returns empty array for a user with no cache', async () => {
      const storage = new IndexedDBProcessOfflineStorage();

      expect(await storage.getProjects('USER_A')).toEqual([]);
    });

    it('keeps each user cache isolated', async () => {
      const storage = new IndexedDBProcessOfflineStorage();

      await storage.saveProjects('USER_A', PROJECTS);
      await storage.saveProjects('USER_B', []);

      expect(await storage.getProjects('USER_A')).toEqual(PROJECTS);
      expect(await storage.getProjects('USER_B')).toEqual([]);
    });
  });

  describe('project tree', () => {
    it('round-trips a saved tree keyed by user + codCli + proyecto', async () => {
      const storage = new IndexedDBProcessOfflineStorage();

      await storage.saveProjectTree('USER_A', '1', '100', TREE);

      expect(await storage.getProjectTree('USER_A', '1', '100')).toEqual(TREE);
    });

    it('returns null when the tree is not cached', async () => {
      const storage = new IndexedDBProcessOfflineStorage();

      expect(await storage.getProjectTree('USER_A', '1', '100')).toBeNull();
    });

    it('isolates trees per user', async () => {
      const storage = new IndexedDBProcessOfflineStorage();

      await storage.saveProjectTree('USER_A', '1', '100', TREE);

      expect(await storage.getProjectTree('USER_A', '1', '100')).toEqual(TREE);
      expect(await storage.getProjectTree('USER_B', '1', '100')).toBeNull();
    });

    it('isolates trees per project key for the same user', async () => {
      const storage = new IndexedDBProcessOfflineStorage();

      await storage.saveProjectTree('USER_A', '1', '100', TREE);

      expect(await storage.getProjectTree('USER_A', '2', '200')).toBeNull();
    });
  });

  describe('metadata', () => {
    it('round-trips last-updated timestamp per user', async () => {
      const storage = new IndexedDBProcessOfflineStorage();

      expect(await storage.getLastUpdated('USER_A')).toBeNull();

      await storage.setLastUpdated('USER_A', 1234);

      expect(await storage.getLastUpdated('USER_A')).toBe(1234);
    });

    it('keeps last-updated isolated per user', async () => {
      const storage = new IndexedDBProcessOfflineStorage();

      await storage.setLastUpdated('USER_A', 1234);

      expect(await storage.getLastUpdated('USER_A')).toBe(1234);
      expect(await storage.getLastUpdated('USER_B')).toBeNull();
    });
  });
});
