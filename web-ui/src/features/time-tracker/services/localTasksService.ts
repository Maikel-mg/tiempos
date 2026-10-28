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

/**
 * Crea en la BD una tarea guardada en local (spNETTiempos_Procesos_Mantenimiento
 * vía /create-process) con la fase real elegida, y reapunta a su id los Registros
 * que la usaban. Si algo falla lanza: la tarea se conserva en local para reintentar.
 */
export async function materializeLocalTask(proceso: number, fase: string): Promise<{ movidos: number }> {
  const config = dbConfig.get();
  if (!config || !config.server || !config.database) {
    throw new Error('Falta la configuración de base de datos');
  }

  const local = (await indexedDBStorage.getLocalProcesses()).find((p) => p.proceso === proceso);
  if (!local) {
    throw new Error('La tarea pendiente ya no existe en este equipo');
  }

  const dto: CreateProcessDTO = { ...local.dto, fase };
  const response = await apiClient.post<{
    success: boolean;
    message?: string;
    resultado?: number | string | null;
  }>('/create-process', { ...config, dto });

  if (!response.success) {
    throw new Error(response.message || 'Error al crear la tarea');
  }

  const idReal = Number(response.data?.resultado);
  if (!Number.isInteger(idReal) || idReal <= 0) {
    throw new Error('El SP no devolvió el id de la tarea creada');
  }

  const real: Proceso = {
    proceso: idReal,
    nombre: local.nombre,
    departamentoId: MY_DEPARTMENT_ID,
    faseNombre: fase,
  };

  const movidos = await indexedDBStorage.remapTaskId(local.proceso, real);
  await indexedDBStorage.upsertProceso(real);
  await indexedDBStorage.deleteLocalProcess(local.proceso);

  return { movidos };
}
