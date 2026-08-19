import { db } from './IndexedDBStorage';
import type { ProcessOfflineStorage } from './ProcessOfflineStorage';
import type { OfflineProjectSelection, Proceso, ProcesoPendiente } from '../../features/time-tracker/types';
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

function selectionKey(usured: string, codCli: string, proyecto: string): string {
  return `${usured}::${codCli}::${proyecto}`;
}

function pendingKey(usured: string, id: number): string {
  return `${usured}::${id}`;
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

  async removeProjectTree(usured: string, codCli: string, proyecto: string): Promise<void> {
    await db.offlineTree.delete(treeKey(usured, codCli, proyecto));
  }

  // Offline projects (marcado por el usuario)
  async getOfflineProjectSelections(usured: string): Promise<OfflineProjectSelection[]> {
    const rows = await db.offlineProjectSelections.where('usured').equals(usured).toArray();
    return rows.map((row) => row.selection);
  }

  async setOfflineProjectSelection(usured: string, selection: OfflineProjectSelection): Promise<void> {
    await db.offlineProjectSelections.put({
      key: selectionKey(usured, selection.codCli, selection.proyecto),
      usured,
      selection,
    });
  }

  async removeOfflineProjectSelection(usured: string, codCli: string, proyecto: string): Promise<void> {
    await db.offlineProjectSelections.delete(selectionKey(usured, codCli, proyecto));
  }

  // Pending processes
  async getPendingProcesses(usured: string): Promise<ProcesoPendiente[]> {
    const rows = await db.pendingProcesses.where('usured').equals(usured).toArray();
    return rows.map((row) => row.pendiente);
  }

  async putPendingProcess(usured: string, pendiente: ProcesoPendiente): Promise<void> {
    await db.pendingProcesses.put({
      key: pendingKey(usured, pendiente.id),
      usured,
      pendiente,
    });
  }

  async removePendingProcess(usured: string, id: number): Promise<void> {
    await db.pendingProcesses.delete(pendingKey(usured, id));
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
