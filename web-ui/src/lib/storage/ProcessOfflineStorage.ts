import type { Proceso, ProcesoPendiente, OfflineProjectSelection } from '../../features/time-tracker/types';
import type { Project, ProjectTreeResponse } from '../../features/projects/types';

/**
 * Interfaz abstracta para el almacenamiento offline de procesos/proyectos/fases.
 * Permite cambiar la implementación (IndexedDB, memoria para tests, etc.) sin
 * modificar la lógica del servicio. Todos los métodos están namespaced por
 * usured: cada usuario tiene su propio caché.
 */
export interface ProcessOfflineStorage {
  // Processes
  getProcesses(usured: string): Promise<Proceso[]>;
  saveProcesses(usured: string, procesos: Proceso[]): Promise<void>;

  // Projects
  getProjects(usured: string): Promise<Project[]>;
  saveProjects(usured: string, projects: Project[]): Promise<void>;

  // Project tree (disciplines → phases → procesos)
  getProjectTree(usured: string, codCli: string, proyecto: string): Promise<ProjectTreeResponse | null>;
  saveProjectTree(usured: string, codCli: string, proyecto: string, tree: ProjectTreeResponse): Promise<void>;
  removeProjectTree(usured: string, codCli: string, proyecto: string): Promise<void>;

  // Offline projects (marcado por el usuario)
  getOfflineProjectSelections(usured: string): Promise<OfflineProjectSelection[]>;
  setOfflineProjectSelection(usured: string, selection: OfflineProjectSelection): Promise<void>;
  removeOfflineProjectSelection(usured: string, codCli: string, proyecto: string): Promise<void>;

  // Pending processes
  getPendingProcesses(usured: string): Promise<ProcesoPendiente[]>;
  putPendingProcess(usured: string, pendiente: ProcesoPendiente): Promise<void>;
  removePendingProcess(usured: string, id: number): Promise<void>;

  // Metadata
  getLastUpdated(usured: string): Promise<number | null>;
  setLastUpdated(usured: string, timestamp: number): Promise<void>;
}
