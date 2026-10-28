import { apiClient } from '@/lib/api/client';
import { dbConfig } from '@/config/stores';
import { indexedDBStorage } from '@/lib/storage/IndexedDBStorage';
import type { CreateProcessDTO } from '@/features/process-management/types';
import type { LocalProcess, Proceso } from '../types';

/** Mismo departamento por defecto que usa el alta de procesos en el backend. */
const MY_DEPARTMENT_ID = 5;

/** Convierte una tarea local en el `Proceso` que consumen el selector y la tabla. */
export function toProceso(local: LocalProcess): Proceso {
  return {
    proceso: local.proceso,
    nombre: local.nombre,
    departamentoId: MY_DEPARTMENT_ID,
    faseNombre: local.dto.fase,
    pendiente: true,
  };
}

/**
 * Guarda una tarea sin conexión. El id es negativo y decreciente para que no
 * pueda colisionar nunca con un id real de la BD.
 */
export async function saveLocalTask(dto: CreateProcessDTO): Promise<Proceso> {
  const existentes = await indexedDBStorage.getLocalProcesses();
  const proceso = Math.min(0, ...existentes.map((p) => p.proceso)) - 1;

  const local: LocalProcess = {
    proceso,
    nombre: dto.nombre,
    dto,
    creadoEn: new Date().toISOString(),
  };
  await indexedDBStorage.saveLocalProcess(local);
  return toProceso(local);
}

export interface MaterializeResult {
  creadas: number;
  /** Registros de tiempo reapuntados al id real en cada tarea creada. */
  movidos: number;
  fallidas: Array<{ nombre: string; error: string }>;
}

/**
 * Crea en la BD las tareas guardadas en local (spNETTiempos_Procesos_Mantenimiento
 * vía /create-process) y reapunta a su id real los Registros que las usaban.
 * Una tarea que falla se conserva en local para reintentar.
 */
export async function materializeLocalTasks(): Promise<MaterializeResult> {
  const config = dbConfig.get();
  if (!config || !config.server || !config.database) {
    throw new Error('Falta la configuración de base de datos');
  }

  const locales = (await indexedDBStorage.getLocalProcesses()).sort(
    (a, b) => a.proceso - b.proceso
  );

  const result: MaterializeResult = { creadas: 0, movidos: 0, fallidas: [] };

  for (const local of locales) {
    const response = await apiClient.post<{
      success: boolean;
      message?: string;
      resultado?: number | string | null;
    }>('/create-process', { ...config, dto: local.dto });

    const resultado = response.success ? response.data?.resultado : undefined;
    const idReal = Number(resultado);

    if (!response.success || !Number.isInteger(idReal) || idReal <= 0) {
      result.fallidas.push({
        nombre: local.nombre,
        error: response.success
          ? 'El SP no devolvió el id de la tarea creada'
          : response.message || 'Error al crear la tarea',
      });
      continue;
    }

    const real: Proceso = {
      proceso: idReal,
      nombre: local.nombre,
      departamentoId: MY_DEPARTMENT_ID,
      faseNombre: local.dto.fase,
    };

    result.movidos += await indexedDBStorage.remapTaskId(local.proceso, real);
    await indexedDBStorage.upsertProceso(real);
    await indexedDBStorage.deleteLocalProcess(local.proceso);
    result.creadas++;
  }

  return result;
}
