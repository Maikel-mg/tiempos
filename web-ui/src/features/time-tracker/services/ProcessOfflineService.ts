import type { ApiResponse } from '@/lib/api/client';
import type { ProcessOfflineStorage } from '@/lib/storage/ProcessOfflineStorage';
import type {
  OfflineProjectSelection,
  OfflineProjectStatus,
  Proceso,
  ProcesoPendiente,
  ProcessSyncExecutionOptions,
  ProcessSyncPlan,
  ProcessSyncProgress,
  ProcessSyncResult,
  ProcessSyncStage,
  TimeEntry,
} from '../types';
import type { Project, ProjectTreeResponse } from '../../projects/types';
import { isTimeEntrySyncBlocked as isEntryBlocked } from '../lib/entrySyncBlock';
import { planProcessSync as planPure } from '../lib/processSyncPlanner';
import { normalizeForMatch } from '@/lib/normalize';
import { dbConfig } from '@/config/stores';
import { apiClient } from '@/lib/api/client';
import { processOfflineStorage } from '@/lib/storage/IndexedDBProcessOfflineStorage';

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
   * Determina si una Entrada de Tiempo no es sincronizable por referenciar un
   * Proceso Pendiente (ID provisional negativo o flag esPendiente).
   * Mensaje UI asociado: "Sincroniza primero los procesos pendientes".
   */
  isTimeEntrySyncBlocked(entry: TimeEntry): boolean {
    return isEntryBlocked(entry);
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
   * Determina si desmarcar un Proyecto Offline está bloqueado por tener
   * Entradas de Tiempo pendientes de sincronización.
   * Bloquea solo si hay entradas con synced=false que pertenecen a ese proyecto
   * (por proyectoId o por Proceso Pendiente de ese proyecto).
   */
  async isProjectRemovalBlocked(
    usured: string,
    codCli: string,
    proyecto: string,
    pendingEntries: TimeEntry[]
  ): Promise<boolean> {
    const hasOffline = await this.isProjectOffline(usured, codCli, proyecto);
    if (!hasOffline) return false;
    const unsynced = pendingEntries.filter((e) => !e.synced);
    if (unsynced.length === 0) return false;

    const pendientes = await this.storage.getPendingProcesses(usured);
    const pendienteById = new Map(pendientes.map((p) => [p.id, p]));

    for (const entry of unsynced) {
      const pending = pendienteById.get(entry.taskId);
      if (pending) {
        // Proceso Pendiente pertenece a este proyecto si su proyectoId coincide con codCli
        if (String(pending.proyectoId) === String(codCli)) return true;
        if (String(pending.proyectoId) === String(proyecto)) return true;
        // También si la entrada expone proyectoId del pendiente
        if (String(entry.proceso?.proyectoId) === String(codCli)) return true;
        continue;
      }
      // Entrada normal: compara proyectoId del proceso con la clave del proyecto offline
      if (String(entry.proceso?.proyectoId) === String(proyecto)) return true;
      if (String(entry.proceso?.proyectoId) === String(codCli)) return true;
    }
    return false;
  }

  /**
   * Quita el marcado offline del proyecto y borra el tree cacheado del mismo.
   * Si no hay tree cacheado, no lanza.
   * Si pendingEntries contiene Entradas pendientes de ese proyecto, lanza error
   * (bloqueo de integridad T5).
   */
  async removeProjectOffline(
    usured: string,
    codCli: string,
    proyecto: string,
    pendingEntries: TimeEntry[] = []
  ): Promise<void> {
    if (pendingEntries.length > 0) {
      const blocked = await this.isProjectRemovalBlocked(usured, codCli, proyecto, pendingEntries);
      if (blocked) {
        throw new Error('No se puede desmarcar: tiene Entradas de Tiempo pendientes de sincronización');
      }
    }
    await this.storage.removeOfflineProjectSelection(usured, codCli, proyecto);
    await this.storage.removeProjectTree(usured, codCli, proyecto);
  }

  /**
   * Sincroniza el caché offline de los Proyectos Offline con el sistema (espejo).
   * Reemplaza cada árbol cacheado con lo que devuelve el backend para ese
   * codCli/proyecto. Nombres actualizados y procesos eliminados se reflejan
   * al reemplazar. Nunca borra ni reasigna Entradas de Tiempo (sagradas).
   */
  async syncOfflineCache(usured: string): Promise<{ succeeded: number; failed: number }> {
    const selections = await this.storage.getOfflineProjectSelections(usured);
    let succeeded = 0;
    let failed = 0;
    for (const sel of selections) {
      try {
        await this.fetchProjectTree(usured, sel.codCli, sel.proyecto);
        await this.setOfflineProjectStatus(usured, sel.codCli, sel.proyecto, 'sincronizado');
        succeeded++;
      } catch {
        failed++;
      }
    }
    return { succeeded, failed };
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

  // ── Sync de Procesos (T6) ─────────────────────────────────────────────────

  /**
   * Planifica el sync bidireccional: pull (sistema no local), push (pendientes)
   * y duplicados por nombre normalizado.
   */
  async planProcessSync(usured: string): Promise<ProcessSyncPlan> {
    const [systemProcesses, localProcesses, pendingProcesses] = await Promise.all([
      this.fetchSystemProcessesRaw(usured),
      this.storage.getProcesses(usured),
      this.storage.getPendingProcesses(usured),
    ]);
    return planPure(systemProcesses, localProcesses, pendingProcesses);
  }

  /**
   * Ejecuta el sync de procesos con progreso por etapas y fallo parcial.
   * - Duplicados "useExisting": remapea entradas al NProceso del sistema y borra el pendiente.
   * - Pendientes (push + duplicados "createNew"): crea en BBDD, obtiene NProceso oficial, remapea entradas.
   * - Pull: importa los procesos seleccionados del sistema al caché local (espejo parcial).
   * - Actualiza timestamp de última actualización.
   * Los fallos de creación se reportan como  "3/4 creados, 1 falló" y pueden reintentarse con retryFailedIds.
   */
  async syncProcesses(
    usured: string,
    options: ProcessSyncExecutionOptions = {},
    onProgress?: (progress: ProcessSyncProgress) => void
  ): Promise<ProcessSyncResult> {
    const systemProcesses = await this.fetchSystemProcessesRaw(usured);
    const localProcesses = await this.storage.getProcesses(usured);
    const pendingProcesses = await this.storage.getPendingProcesses(usured);
    const plan = planPure(systemProcesses, localProcesses, pendingProcesses);

    const selectedPullIds = options.selectedPullIds ?? plan.pull.map((p) => p.proceso);
    const pullSelected = plan.pull.filter((p) => selectedPullIds.includes(p.proceso));

    const duplicateResolutions = options.duplicateResolutions ?? {};

    let remappedDuplicates = 0;
    let remappedEntries = 0;

    // Etapa remap: duplicados "usar el existente"
    const useExistingDupes = plan.duplicates.filter((d) => duplicateResolutions[d.pending.id] === 'useExisting');
    if (useExistingDupes.length > 0 && onProgress) {
      onProgress({ stage: 'remap' as ProcessSyncStage, completed: 0, total: useExistingDupes.length });
    }
    for (let i = 0; i < useExistingDupes.length; i++) {
      const dup = useExistingDupes[i];
      const count = await this.remapEntriesForPending(dup.pending.id, dup.system);
      remappedEntries += count;
      await this.storage.removePendingProcess(usured, dup.pending.id);
      remappedDuplicates++;
      if (onProgress) {
        onProgress({ stage: 'remap' as ProcessSyncStage, completed: i + 1, total: useExistingDupes.length });
      }
    }

    // Determinar pendientes a crear
    let toCreate: ProcesoPendiente[] = [];
    toCreate.push(...plan.push);
    for (const dup of plan.duplicates) {
      if (duplicateResolutions[dup.pending.id] === 'createNew') {
        toCreate.push(dup.pending);
      }
    }
    if (options.retryFailedIds && options.retryFailedIds.length > 0) {
      const set = new Set(options.retryFailedIds);
      toCreate = toCreate.filter((p) => set.has(p.id));
    }
    toCreate.sort((a, b) => a.id - b.id);

    const failures: Array<{ pendingId: number; error: string }> = [];
    let succeeded = 0;
    const totalToCreate = toCreate.length;

    if (totalToCreate > 0 && onProgress) {
      onProgress({ stage: 'push' as ProcessSyncStage, completed: 0, total: totalToCreate });
    }
    for (let i = 0; i < toCreate.length; i++) {
      const pending = toCreate[i];
      try {
        const nProceso = await this.createPendingOnBackend(pending, usured);
        let officialId: number | null = nProceso;
        if (officialId == null) {
          const fresh = await this.fetchSystemProcessesRaw(usured);
          const match = fresh.find((s) => normalizeForMatch(s.nombre) === normalizeForMatch(pending.nombre));
          if (match) officialId = match.proceso;
        }
        if (officialId == null || !Number.isFinite(officialId) || officialId <= 0) {
          throw new Error('No se pudo obtener NProceso oficial');
        }
        const officialProceso: Proceso = {
          proceso: officialId,
          nombre: pending.nombre,
          faseId: pending.faseId,
          faseNombre: pending.faseNombre,
          proyectoId: pending.proyectoId,
          proyectoNombre: pending.proyectoNombre,
          clienteId: pending.clienteId,
          clienteNombre: pending.clienteNombre,
        };
        const count = await this.remapEntriesForPending(pending.id, officialProceso);
        remappedEntries += count;
        await this.storage.removePendingProcess(usured, pending.id);
        succeeded++;
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        failures.push({ pendingId: pending.id, error: message });
      }
      if (onProgress) {
        onProgress({ stage: 'push' as ProcessSyncStage, completed: i + 1, total: totalToCreate });
      }
    }

    // Etapa pull + espejo: refrescar caché de procesos con el sistema (espejo)
    // Si no hay selección de pull, no intentamos mirror innecesario cuando no hubo creación ni remap? Pero siempre actualizamos timestamp si hubo algún cambio.
    let pulled = 0;
    try {
      const freshSystem = await this.fetchSystemProcessesRaw(usured);
      await this.storage.saveProcesses(usured, freshSystem);
      await this.storage.setLastUpdated(usured, Date.now());
      pulled = pullSelected.length;
      if (onProgress) onProgress({ stage: 'pull' as ProcessSyncStage, completed: pulled, total: plan.pull.length });
      if (onProgress) onProgress({ stage: 'mirror' as ProcessSyncStage, completed: 1, total: 1 });
    } catch {
      // mirror falló: no actualizamos lastUpdated, pero el resto del sync ya está hecho
      pulled = 0;
    }

    if (onProgress) onProgress({ stage: 'done' as ProcessSyncStage, completed: totalToCreate, total: totalToCreate });

    const lastUpdated = await this.storage.getLastUpdated(usured);

    return {
      pulled,
      created: { succeeded, failed: failures.length, failures },
      remappedDuplicates,
      remappedEntries,
      failedIds: failures.map((f) => f.pendingId),
      lastUpdated,
    };
  }

  private async fetchSystemProcessesRaw(usured: string): Promise<Proceso[]> {
    const dbConf = dbConfig.get();
    const response = await this.apiClient.post<BackendBody<Proceso[]>>('/processes', {
      usured,
      server: dbConf?.server,
      database: dbConf?.database,
      username: dbConf?.username,
      password: dbConf?.password,
    });
    return unwrap(response);
  }

  private async createPendingOnBackend(pending: ProcesoPendiente, usured: string): Promise<number | null> {
    const dbConf = dbConfig.get();
    const dto = {
      nombre: pending.nombre,
      usuario: usured,
      fase: String(pending.faseId ?? ''),
      minutos: pending.minutos,
      fechaInicio: toDDMMYYYY(pending.fechaInicio),
      fechaFin: toDDMMYYYY(pending.fechaFin),
      fechaEstimacion: toDDMMYYYY(pending.fechaEstimacion),
    };
    if (!dto.fase) {
      throw new Error('Fase requerida para crear proceso');
    }
    const response = await this.apiClient.post<{
      success: boolean;
      message?: string;
      nProceso?: number | string | null;
      recordsets?: unknown;
      data?: unknown;
    }>('/create-process', {
      server: dbConf?.server,
      database: dbConf?.database,
      username: dbConf?.username,
      password: dbConf?.password,
      dto,
    });
    if (!response.success) {
      throw new Error(response.message ?? 'Error al crear proceso');
    }
    const data: unknown = response.data as unknown;
    // Backend returns { success:true, nProceso, recordsets }
    if (data && typeof data === 'object') {
      const rec = data as Record<string, unknown>;
      if (rec['nProceso'] != null) {
        const parsed = Number(String(rec['nProceso']).trim());
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
      }
      // También puede venir como recordsets → buscar NProceso en cualquier recordset
      const rs = rec['recordsets'] as unknown;
      if (Array.isArray(rs)) {
        for (const set of rs as unknown[]) {
          if (Array.isArray(set)) {
            for (const row of set as Record<string, unknown>[]) {
              if (row && row['NProceso'] != null) {
                const parsed = Number(String(row['NProceso']).trim());
                if (Number.isFinite(parsed) && parsed > 0) return parsed;
              }
            }
          }
        }
      }
      if (Array.isArray(data)) {
        for (const row of data as Record<string, unknown>[]) {
          if (row && row['NProceso'] != null) {
            const parsed = Number(String(row['NProceso']).trim());
            if (Number.isFinite(parsed) && parsed > 0) return parsed;
          }
        }
      }
    }
    // Si el ApiClient ya desempaquetó el body interno (BackendBody), nProceso puede estar en response.data.data
    // Intentar castear como BackendBody
    return null;
  }

  private async remapEntriesForPending(pendingId: number, officialProceso: Proceso): Promise<number> {
    const entries = await this.storage.getTimeEntries();
    let count = 0;
    for (const entry of entries) {
      const isPendingRef =
        entry.taskId === pendingId ||
        entry.proceso?.proceso === pendingId ||
        entry.proceso?.procesoPendienteId === pendingId;
      if (!isPendingRef) continue;
      const updated: TimeEntry = {
        ...entry,
        taskId: officialProceso.proceso,
        taskName: officialProceso.nombre,
        proceso: {
          ...officialProceso,
          esPendiente: false,
          procesoPendienteId: undefined,
        },
        updatedAt: new Date().toISOString(),
      };
      await this.storage.putTimeEntry(updated);
      count++;
    }
    return count;
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

function toDDMMYYYY(isoDate?: string): string {
  if (!isoDate) return '';
  // isoDate is YYYY-MM-DD → DD/MM/YYYY
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }
  return isoDate;
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

// Instancia por defecto con IndexedDB y el ApiClient real
export const processOfflineService = new ProcessOfflineService(processOfflineStorage, apiClient);
