import type { Proceso } from '../../features/time-tracker/types';
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

  // Metadata
  getLastUpdated(usured: string): Promise<number | null>;
  setLastUpdated(usured: string, timestamp: number): Promise<void>;
}
