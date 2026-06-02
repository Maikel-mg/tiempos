import type { Table } from 'dexie';
import type { Proceso } from '../types';

/**
 * API response types matching the /api/projects-tree endpoint shape.
 * These are local to the repository — consumers never see them.
 */
interface ApiCliente {
  CodCli: number;
  Cliente: string;
  NomCliente: string;
}

interface ApiProyecto {
  CodCli: number;
  Proyecto: number;
  NomProy: string;
}

interface ApiProceso {
  proceso: number;
  nombre: string;
}

interface ApiFase {
  fase: number;
  nombre: string;
  procesos: ApiProceso[];
}

interface ApiDisciplina {
  idDisciplina: number;
  nombre: string;
  fases: ApiFase[];
}

interface ApiResponseData {
  cliente: ApiCliente;
  proyecto: ApiProyecto;
  disciplinas: ApiDisciplina[];
}

interface ApiResponse {
  success: boolean;
  data: ApiResponseData;
}

interface ApiClient {
  post<T>(url: string, data?: unknown): Promise<T>;
}

interface ProcessCacheDB {
  table(name: string): Table;
}

/**
 * ProcessCacheRepository — owns the local catalog of Proceso records.
 *
 * First call to getAll triggers a fetch from /api/projects-tree, flattens the
 * hierarchical response into Proceso records, and persists them in IndexedDB.
 * Subsequent calls serve from cache. refresh() re-fetches and replaces atomically.
 *
 * Exposes: getAll, getById, search, getRecent, refresh, markUsed.
 */
export class ProcessCacheRepository {
  private processes: Table<Proceso, number>;
  private processRecents: Table<{ proceso: number; lastUsedAt: number }, number>;
  private apiClient: ApiClient;
  private cacheLoaded = false;

  constructor(db: ProcessCacheDB, apiClient: ApiClient) {
    this.processes = db.table('processes');
    this.processRecents = db.table('processRecents');
    this.apiClient = apiClient;
  }

  /**
   * Returns all cached processes. On first call, fetches from the API
   * and persists the flattened result.
   */
  async getAll(): Promise<Proceso[]> {
    if (!this.cacheLoaded) {
      await this.refresh();
    }
    return this.processes.toArray();
  }

  /**
   * Returns a single process by its numeric ID.
   */
  async getById(procesoId: number): Promise<Proceso | undefined> {
    if (!this.cacheLoaded) {
      await this.refresh();
    }
    return this.processes.get(procesoId);
  }

  /**
   * Searches processes by text against nombre, faseNombre, and proyectoNombre.
   * Case-insensitive. Empty string returns all.
   */
  async search(text: string): Promise<Proceso[]> {
    if (!this.cacheLoaded) {
      await this.refresh();
    }

    if (!text) {
      return this.processes.toArray();
    }

    const lower = text.toLowerCase();
    const all = await this.processes.toArray();

    return all.filter(
      (p) =>
        p.nombre.toLowerCase().includes(lower) ||
        (p.faseNombre ?? '').toLowerCase().includes(lower) ||
        (p.proyectoNombre ?? '').toLowerCase().includes(lower)
    );
  }

  /**
   * Returns top-N recently used processes, ordered by lastUsedAt desc.
   * Default limit is 10.
   */
  async getRecent(limit = 10): Promise<Proceso[]> {
    const recents = await this.processRecents
      .orderBy('lastUsedAt')
      .reverse()
      .limit(limit)
      .toArray();

    const results: Proceso[] = [];
    for (const r of recents) {
      const p = await this.processes.get(r.proceso);
      if (p) results.push(p);
    }
    return results;
  }

  /**
   * Re-fetches from the API and replaces the processes table atomically.
   */
  async refresh(): Promise<void> {
    const response = await this.apiClient.post<ApiResponse>('/projects-tree');
    const processes = this.flattenResponse(response);

    await this.processes.clear();
    if (processes.length > 0) {
      await this.processes.bulkPut(processes);
    }

    this.cacheLoaded = true;
  }

  /**
   * Marks a process as recently used and ensures it's cached in the processes table.
   * Accepts the full Proceso so it can be persisted for later use.
   */
  async markUsed(process: Proceso): Promise<void> {
    // Ensure the process is in the main cache
    await this.processes.put(process, process.proceso);
    // Update recency
    await this.processRecents.put(
      { proceso: process.proceso, lastUsedAt: Date.now() },
      process.proceso
    );
  }

  /**
   * Flattens the hierarchical API response into a flat list of Proceso records.
   * Traverses disciplinas → fases → procesos, enriching each with context.
   */
  private flattenResponse(response: ApiResponse): Proceso[] {
    const { cliente, proyecto, disciplinas } = response.data;
    const result: Proceso[] = [];

    for (const disciplina of disciplinas ?? []) {
      for (const fase of disciplina.fases ?? []) {
        for (const proc of fase.procesos ?? []) {
          result.push({
            proceso: proc.proceso,
            nombre: proc.nombre,
            faseNombre: fase.nombre,
            proyectoNombre: proyecto.NomProy,
            clienteNombre: cliente.NomCliente,
          });
        }
      }
    }

    return result;
  }
}
