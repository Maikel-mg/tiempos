import type { ProcessOfflineStorage } from '../ProcessOfflineStorage';
import type { Proceso } from '../../../features/time-tracker/types';
import type { Project, ProjectTreeResponse } from '../../../features/projects/types';

/**
 * Fake de ProcessOfflineStorage en memoria para tests. Replica el namespacing
 * por usured del IndexedDB (offlineProcesses/offlineProjects/offlineTree/offlineMeta),
 * de modo que cada usuario tiene su propio caché.
 */
export class InMemoryProcessOfflineStorage implements ProcessOfflineStorage {
  private processesByUser = new Map<string, Proceso[]>();
  private projectsByUser = new Map<string, Project[]>();
  private treesByUser = new Map<string, ProjectTreeResponse>();
  private lastUpdatedByUser = new Map<string, number>();

  async getProcesses(usured: string): Promise<Proceso[]> {
    return this.processesByUser.get(usured) ?? [];
  }

  async saveProcesses(usured: string, procesos: Proceso[]): Promise<void> {
    this.processesByUser.set(usured, procesos);
  }

  async getProjects(usured: string): Promise<Project[]> {
    return this.projectsByUser.get(usured) ?? [];
  }

  async saveProjects(usured: string, projects: Project[]): Promise<void> {
    this.projectsByUser.set(usured, projects);
  }

  async getProjectTree(usured: string, codCli: string, proyecto: string): Promise<ProjectTreeResponse | null> {
    return this.treesByUser.get(this.treeKey(usured, codCli, proyecto)) ?? null;
  }

  async saveProjectTree(usured: string, codCli: string, proyecto: string, tree: ProjectTreeResponse): Promise<void> {
    this.treesByUser.set(this.treeKey(usured, codCli, proyecto), tree);
  }

  async getLastUpdated(usured: string): Promise<number | null> {
    return this.lastUpdatedByUser.get(usured) ?? null;
  }

  async setLastUpdated(usured: string, timestamp: number): Promise<void> {
    this.lastUpdatedByUser.set(usured, timestamp);
  }

  private treeKey(usured: string, codCli: string, proyecto: string): string {
    return `${usured}::${codCli}::${proyecto}`;
  }
}
