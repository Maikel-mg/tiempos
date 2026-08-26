import type { ApiResponse } from '@/lib/api/client';
import type { ProcessOfflineStorage } from '@/lib/storage/ProcessOfflineStorage';
import type { OfflineProjectSelection, OfflineProjectStatus, Proceso, ProcesoPendiente } from '../types';
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
   * Devuelve los procesos de los Proyectos Offline del usuario a partir de
   * sus árboles cacheados. Los proyectos marcados sin árbol disponible se
   * omiten hasta que el próximo sync complete su caché.
   */
  async getOfflineProcesses(usured: string): Promise<Proceso[]> {
    const selections = await this.storage.getOfflineProjectSelections(usured);
    const trees = await Promise.all(
      selections.map(async (selection) => ({
        selection,
        tree: await this.storage.getProjectTree(usured, selection.codCli, selection.proyecto),
      }))
    );
    const processes = new Map<number, Proceso>();

    for (const { selection, tree } of trees) {
      if (!tree) continue;
      for (const disciplina of tree.disciplinas) {
        for (const fase of disciplina.fases) {
          for (const process of fase.procesos) {
            if (processes.has(process.proceso)) continue;
            processes.set(process.proceso, {
              proceso: process.proceso,
              nombre: process.nombre,
              faseId: fase.fase,
              faseNombre: fase.nombre,
              proyectoId: tree.proyecto.proyecto,
              proyectoNombre: tree.proyecto.nomProy || selection.nomProy,
              clienteId: String(tree.cliente.codCli),
              clienteNombre: tree.cliente.nomCliente || selection.nomCliente,
              disciplinaId: disciplina.idDisciplina,
              esProyectoOffline: true,
            });
          }
        }
      }
    }

    return [...processes.values()];
  }

  /**
   * Timestamp (ms) de la última vez que se actualizó el caché del usuario,
   * o null si el usuario todavía no tiene caché.
   */
  async getLastUpdated(usured: string): Promise<number | null> {
    return this.storage.getLastUpdated(usured);
  }

  // ── Proyectos Offline (marcado) ─────────────────────────────────────────────

  /**
   * Devuelve los proyectos que el usuario marcó como offline.
   */
  async getOfflineProjectSelections(usured: string): Promise<OfflineProjectSelection[]> {
    return this.storage.getOfflineProjectSelections(usured);
  }

  /**
   * true si el usuario marcó el proyecto como offline.
   */
  async isProjectOffline(usured: string, codCli: string, proyecto: string): Promise<boolean> {
    const selections = await this.storage.getOfflineProjectSelections(usured);
    return selections.some((s) => s.codCli === codCli && s.proyecto === proyecto);
  }

  /**
   * Marca un proyecto como offline con estado 'pendiente'.
   *
   * NOTA: el refresco de fases/tareas (cargar el tree del proyecto a caché) NO
   * forma parte de este método: lo orquesta la tanda UI llamando a
   * `getProjectTree(usured, codCli, proyecto, { refresh: true })` y después a
   * `setOfflineProjectStatus(usured, codCli, proyecto, 'sincronizado')`. El
   * estado 'sincronizado' lo establece ese flujo de refresco.
   */
  async markProjectOffline(
    usured: string,
    input: Omit<OfflineProjectSelection, 'markedAt' | 'status'>
  ): Promise<OfflineProjectSelection> {
    const selection: OfflineProjectSelection = {
      codCli: input.codCli,
      proyecto: input.proyecto,
      nomProy: input.nomProy,
      nomCliente: input.nomCliente,
      status: 'pendiente',
      markedAt: Date.now(),
    };
    await this.storage.setOfflineProjectSelection(usured, selection);
    return selection;
  }

  /**
   * Quita el marcado offline del proyecto y borra el tree cacheado del mismo.
   * Si no hay tree cacheado, no lanza.
   */
  async removeProjectOffline(usured: string, codCli: string, proyecto: string): Promise<void> {
    await this.storage.removeOfflineProjectSelection(usured, codCli, proyecto);
    await this.storage.removeProjectTree(usured, codCli, proyecto);
  }

  /**
   * Actualiza solo el estado de una selección offline existente (p.ej. a
   * 'sincronizado' tras refrescar el tree). No-op si la selección no existe.
   */
  async setOfflineProjectStatus(
    usured: string,
    codCli: string,
    proyecto: string,
    status: OfflineProjectStatus
  ): Promise<void> {
    const selections = await this.storage.getOfflineProjectSelections(usured);
    const existing = selections.find((s) => s.codCli === codCli && s.proyecto === proyecto);
    if (!existing) {
      return;
    }
    await this.storage.setOfflineProjectSelection(usured, { ...existing, status });
  }

  // ── Procesos Pendientes ─────────────────────────────────────────────────────

  /**
   * Devuelve los procesos pendientes del usuario, ordenados por id.
   */
  async getPendingProcesses(usured: string): Promise<ProcesoPendiente[]> {
    const pendientes = await this.storage.getPendingProcesses(usured);
    return [...pendientes].sort((a, b) => a.id - b.id);
  }

  /**
   * Crea un proceso pendiente con el siguiente ID provisional negativo
   * (min(ids existentes, -1) - 1 → -1, -2, ...) y persiste con
   * createdAt/updatedAt = Date.now().
   */
  async createPendingProcess(
    usured: string,
    input: Omit<ProcesoPendiente, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ProcesoPendiente> {
    const existing = await this.storage.getPendingProcesses(usured);
    const id = existing.length === 0 ? -1 : Math.min(...existing.map((p) => p.id)) - 1;
    const now = Date.now();
    const pendiente: ProcesoPendiente = {
      ...input,
      id,
      createdAt: now,
      updatedAt: now,
    };
    await this.storage.putPendingProcess(usured, pendiente);
    return pendiente;
  }

  /**
   * Actualiza los campos de un proceso pendiente (merge) y refresca updatedAt.
   * Devuelve null si el id no existe.
   */
  async updatePendingProcess(
    usured: string,
    id: number,
    patch: Partial<Omit<ProcesoPendiente, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<ProcesoPendiente | null> {
    const existing = await this.storage.getPendingProcesses(usured);
    const pendiente = existing.find((p) => p.id === id);
    if (!pendiente) {
      return null;
    }
    const updated: ProcesoPendiente = {
      ...pendiente,
      ...patch,
      id: pendiente.id,
      createdAt: pendiente.createdAt,
      updatedAt: Date.now(),
    };
    await this.storage.putPendingProcess(usured, updated);
    return updated;
  }

  /**
   * Elimina un proceso pendiente. No-op si el id no existe.
   */
  async deletePendingProcess(usured: string, id: number): Promise<void> {
    await this.storage.removePendingProcess(usured, id);
  }

  /**
   * Convierte los procesos pendientes del usuario al tipo Proceso para el
   * selector: proceso = id provisional negativo, esPendiente = true y
   * procesoPendienteId = id.
   */
  async getPendingProcessesAsProcesos(usured: string): Promise<Proceso[]> {
    const pendientes = await this.getPendingProcesses(usured);
    return pendientes.map(
      (p): Proceso => ({
        proceso: p.id,
        nombre: p.nombre,
        faseId: p.faseId,
        faseNombre: p.faseNombre,
        proyectoId: p.proyectoId,
        proyectoNombre: p.proyectoNombre,
        clienteId: p.clienteId,
        clienteNombre: p.clienteNombre,
        esPendiente: true,
        procesoPendienteId: p.id,
      })
    );
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
