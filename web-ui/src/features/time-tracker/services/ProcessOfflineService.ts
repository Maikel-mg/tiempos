import type { ApiResponse } from '@/lib/api/client';
import type { ProcessOfflineStorage } from '@/lib/storage/ProcessOfflineStorage';
import type { Proceso } from '../types';
import type { Project, ProjectTreeResponse } from '../../projects/types';

export interface ProcessOfflineApiClient {
  post<T>(url: string, data?: unknown): Promise<ApiResponse<T>>;
}

/** Body que devuelven los endpoints del backend (envuelto de nuevo por ApiClient). */
interface BackendBody<T> {
  success: boolean;
  message?: string;
  data: T;
}

/**
 * Servicio de acceso a procesos/proyectos/fases con caché offline por usured.
 *
 * Es el único punto de acceso al catálogo offline: lee primero del caché
 * (IndexedDB en producción, memoria en tests) y solo cae al backend cuando el
 * caché está vacío o se solicita un refresh explícito. Tras un fetch exitoso
 * persiste el dato y actualiza el timestamp de última actualización.
 *
 * El patrón de persistencia de las entradas de tiempo (StorageStrategy) se
 * aplica aquí: el servicio recibe una interfaz de almacenamiento y un cliente
 * de API por constructor, lo que permite inyectar fakes en los tests.
 */
export class ProcessOfflineService {
  constructor(
    private storage: ProcessOfflineStorage,
    private apiClient: ProcessOfflineApiClient
  ) {}

  /**
   * Devuelve los procesos del usuario. Sirve desde caché si hay datos;
   * de lo contrario hace fetch a /api/processes, persiste y actualiza el
   * timestamp. `refresh: true` fuerza el fetch ignorando el caché.
   */
  async getProcesses(usured: string, options: { refresh?: boolean } = {}): Promise<Proceso[]> {
    if (!options.refresh) {
      const cached = await this.storage.getProcesses(usured);
      if (cached.length > 0) {
        return cached;
      }
    }
    return this.fetchProcesses(usured);
  }

  /**
   * Devuelve los proyectos del usuario. Misma semántica de caché que getProcesses.
   */
  async getProjects(usured: string, options: { refresh?: boolean } = {}): Promise<Project[]> {
    if (!options.refresh) {
      const cached = await this.storage.getProjects(usured);
      if (cached.length > 0) {
        return cached;
      }
    }
    return this.fetchProjects(usured);
  }

  /**
   * Devuelve el árbol de un proyecto (disciplinas → fases → procesos).
   * El árbol se cachea por usuario y clave proyecto (codCli + proyecto).
   * Devuelve null si el backend no tiene datos para la clave.
   */
  async getProjectTree(
    usured: string,
    codCli: string,
    proyecto: string,
    options: { refresh?: boolean } = {}
  ): Promise<ProjectTreeResponse | null> {
    if (!options.refresh) {
      const cached = await this.storage.getProjectTree(usured, codCli, proyecto);
      if (cached) {
        return cached;
      }
    }
    return this.fetchProjectTree(usured, codCli, proyecto);
  }

  /**
   * Timestamp (ms) de la última vez que se actualizó el caché del usuario,
   * o null si el usuario todavía no tiene caché.
   */
  async getLastUpdated(usured: string): Promise<number | null> {
    return this.storage.getLastUpdated(usured);
  }

  private async fetchProcesses(usured: string): Promise<Proceso[]> {
    const dbConf = dbConfig.get();
    const response = await this.apiClient.post<BackendBody<Proceso[]>>('/processes', {
      usured,
      server: dbConf?.server,
      database: dbConf?.database,
      username: dbConf?.username,
      password: dbConf?.password,
    });
    const procesos = unwrap(response);
    await this.storage.saveProcesses(usured, procesos);
    await this.storage.setLastUpdated(usured, Date.now());
    return procesos;
  }

  private async fetchProjects(usured: string): Promise<Project[]> {
    const dbConf = dbConfig.get();
    const response = await this.apiClient.post<BackendBody<Project[]>>('/projects', {
      server: dbConf?.server,
      database: dbConf?.database,
      username: dbConf?.username,
      password: dbConf?.password,
      fecha: new Date().toISOString().split('T')[0],
      modoProc: '',
      usured,
    });
    const projects = unwrap(response);
    await this.storage.saveProjects(usured, projects);
    await this.storage.setLastUpdated(usured, Date.now());
    return projects;
  }

  private async fetchProjectTree(usured: string, codCli: string, proyecto: string): Promise<ProjectTreeResponse | null> {
    const dbConf = dbConfig.get();
    const response = await this.apiClient.post<BackendBody<ProjectTreeResponse>>('/projects-tree', {
      server: dbConf?.server,
      database: dbConf?.database,
      username: dbConf?.username,
      password: dbConf?.password,
      codCli,
      proyecto,
    });
    const tree = unwrap(response);
    await this.storage.saveProjectTree(usured, codCli, proyecto, tree);
    await this.storage.setLastUpdated(usured, Date.now());
    return tree;
  }
}

function unwrap<T>(response: ApiResponse<BackendBody<T>>): T {
  if (!response.success) {
    throw new Error(response.message);
  }
  const body = response.data;
  if (!body.success) {
    throw new Error(body.message || 'Error al cargar datos');
  }
  return body.data;
}

import { dbConfig } from '@/config/stores';
import { apiClient } from '@/lib/api/client';
import { processOfflineStorage } from '@/lib/storage/IndexedDBProcessOfflineStorage';

// Instancia por defecto con IndexedDB y el ApiClient real
export const processOfflineService = new ProcessOfflineService(processOfflineStorage, apiClient);
