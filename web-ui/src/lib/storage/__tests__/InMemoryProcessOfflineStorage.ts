import type { ProcessOfflineStorage } from '../ProcessOfflineStorage';
import type { Proceso, ProcesoPendiente, OfflineProjectSelection, TimeEntry } from '../../../features/time-tracker/types';
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
  private offlineSelections = new Map<string, OfflineProjectSelection>();
  private pendingProcesses = new Map<string, ProcesoPendiente>();
  private timeEntries = new Map<string, TimeEntry>();
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

  async removeProjectTree(usured: string, codCli: string, proyecto: string): Promise<void> {
    this.treesByUser.delete(this.treeKey(usured, codCli, proyecto));
  }

  // Offline projects
  async getOfflineProjectSelections(usured: string): Promise<OfflineProjectSelection[]> {
    const prefix = this.userPrefix(usured);
    return [...this.offlineSelections.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([, selection]) => selection);
  }

  async setOfflineProjectSelection(usured: string, selection: OfflineProjectSelection): Promise<void> {
    this.offlineSelections.set(this.selectionKey(usured, selection.codCli, selection.proyecto), selection);
  }

  async removeOfflineProjectSelection(usured: string, codCli: string, proyecto: string): Promise<void> {
    this.offlineSelections.delete(this.selectionKey(usured, codCli, proyecto));
  }

  // Pending processes
  async getPendingProcesses(usured: string): Promise<ProcesoPendiente[]> {
    const prefix = this.userPrefix(usured);
    return [...this.pendingProcesses.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([, pendiente]) => pendiente);
  }

  async putPendingProcess(usured: string, pendiente: ProcesoPendiente): Promise<void> {
    this.pendingProcesses.set(this.pendingKey(usured, pendiente.id), pendiente);
  }

  async removePendingProcess(usured: string, id: number): Promise<void> {
    this.pendingProcesses.delete(this.pendingKey(usured, id));
  }

  async getTimeEntries(): Promise<TimeEntry[]> {
    return [...this.timeEntries.values()];
  }

  async putTimeEntry(entry: TimeEntry): Promise<void> {
    this.timeEntries.set(entry.id, entry);
  }

  async getLastUpdated(usured: string): Promise<number | null> {
    return this.lastUpdatedByUser.get(usured) ?? null;
  }

  async setLastUpdated(usured: string, timestamp: number): Promise<void> {
    this.lastUpdatedByUser.set(usured, timestamp);
  }

  private userPrefix(usured: string): string {
    return `${usured}::`;
  }

  private treeKey(usured: string, codCli: string, proyecto: string): string {
    return `${usured}::${codCli}::${proyecto}`;
  }

  private selectionKey(usured: string, codCli: string, proyecto: string): string {
    return `${usured}::${codCli}::${proyecto}`;
  }

  private pendingKey(usured: string, id: number): string {
    return `${usured}::${id}`;
  }
}
