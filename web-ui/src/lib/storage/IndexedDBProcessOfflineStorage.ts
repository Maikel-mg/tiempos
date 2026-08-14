import { db } from './IndexedDBStorage';
import type { ProcessOfflineStorage } from './ProcessOfflineStorage';
import type { Proceso } from '../../features/time-tracker/types';
import type { Project, ProjectTreeResponse } from '../../features/projects/types';

function processKey(usured: string, proceso: number): string {
  return `${usured}::${proceso}`;
}

function projectKey(usured: string, proyecto: Project): string {
  return `${usured}::${proyecto.CodCli}::${proyecto.Proyecto}`;
}

function treeKey(usured: string, codCli: string, proyecto: string): string {
  return `${usured}::${codCli}::${proyecto}`;
}

/**
 * Implementación de ProcessOfflineStorage sobre IndexedDB (Dexie).
 * Cada registro se guarda namespaced por usured: las primary keys incluyen el
 * usured, de modo que cada usuario tiene su propio caché de procesos,
 * proyectos, árboles y timestamp de última actualización.
 */
export class IndexedDBProcessOfflineStorage implements ProcessOfflineStorage {
  // Processes
  async getProcesses(usured: string): Promise<Proceso[]> {
    const rows = await db.offlineProcesses.where('usured').equals(usured).toArray();
    return rows.map((row) => row.proceso);
  }

  async saveProcesses(usured: string, procesos: Proceso[]): Promise<void> {
    if (procesos.length === 0) {
      await db.offlineProcesses.where('usured').equals(usured).delete();
      return;
    }
    await db.offlineProcesses
      .where('usured')
      .equals(usured)
      .delete();
    await db.offlineProcesses.bulkPut(
      procesos.map((proceso) => ({
        key: processKey(usured, proceso.proceso),
        usured,
        proceso,
      }))
    );
  }

  // Projects
  async getProjects(usured: string): Promise<Project[]> {
    const rows = await db.offlineProjects.where('usured').equals(usured).toArray();
    return rows.map((row) => row.proyecto);
  }

  async saveProjects(usured: string, projects: Project[]): Promise<void> {
    if (projects.length === 0) {
      await db.offlineProjects.where('usured').equals(usured).delete();
      return;
    }
    await db.offlineProjects
      .where('usured')
      .equals(usured)
      .delete();
    await db.offlineProjects.bulkPut(
      projects.map((proyecto) => ({
        key: projectKey(usured, proyecto),
        usured,
        proyecto,
      }))
    );
  }

  // Project tree (disciplines → phases → procesos)
  async getProjectTree(usured: string, codCli: string, proyecto: string): Promise<ProjectTreeResponse | null> {
    const row = await db.offlineTree.get(treeKey(usured, codCli, proyecto));
    return row?.tree ?? null;
  }

  async saveProjectTree(usured: string, codCli: string, proyecto: string, tree: ProjectTreeResponse): Promise<void> {
    await db.offlineTree.put({
      key: treeKey(usured, codCli, proyecto),
      usured,
      codCli,
      proyecto,
      tree,
    });
  }

  // Metadata
  async getLastUpdated(usured: string): Promise<number | null> {
    const row = await db.offlineMeta.get(usured);
    return row?.lastUpdated ?? null;
  }

  async setLastUpdated(usured: string, timestamp: number): Promise<void> {
    await db.offlineMeta.put({ usured, lastUpdated: timestamp });
  }
}

// Exportar instancia singleton
export const processOfflineStorage = new IndexedDBProcessOfflineStorage();
