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
 * Tarea guardada sin conexión, para poder corregirla antes de crearla en la BD.
 */
export async function getLocalTask(proceso: number): Promise<LocalProcess | undefined> {
  return (await indexedDBStorage.getLocalProcesses()).find((p) => p.proceso === proceso);
}

/**
 * El borrado se niega porque la tarea todavía tiene Registros. Lleva el conteo
 * para que la UI pueda abrir el desglose en vez de sólo mostrar el mensaje.
 */
export class TaskHasEntriesError extends Error {
  readonly count: number;

  constructor(count: number) {
    super(`La tarea tiene ${count} registro(s) de tiempo: reasignalos o borralos antes de eliminarla`);
    this.name = 'TaskHasEntriesError';
    this.count = count;
  }
}

/**
 * Borra una tarea creada sin conexión. Se niega si tiene Registros: nunca se
 * sincronizaron, así que borrarla los dejaría huérfanos y sin traza.
 */
export async function deleteLocalTask(proceso: number): Promise<void> {
  const local = await getLocalTask(proceso);
  if (!local) {
    throw new Error('La tarea pendiente ya no existe en este equipo');
  }

  const registros = await indexedDBStorage.countEntriesByTaskId(proceso);
  if (registros > 0) {
    throw new TaskHasEntriesError(registros);
  }

  await indexedDBStorage.deleteLocalProcess(proceso);
}

/**
 * Crea en la BD una tarea guardada en local (spNETTiempos_Procesos_Mantenimiento
 * vía /create-process) con la fase real elegida, y reapunta a su id los Registros
 * que la usaban. Si algo falla lanza: la tarea se conserva en local para reintentar.
 * Las fechas previstas se pueden corregir aquí: la tarea se creó sin conexión y
 * una fecha imposible (31/11/2026) haría fallar la conversión en SQL Server.
 */
export interface MaterializeChanges {
  fase: string;
  fechaInicio?: string;
  fechaFin?: string;
}

export async function materializeLocalTask(
  proceso: number,
  changes: MaterializeChanges
): Promise<{ movidos: number }> {
  const config = dbConfig.get();
  if (!config || !config.server || !config.database) {
    throw new Error('Falta la configuración de base de datos');
  }

  const local = await getLocalTask(proceso);
  if (!local) {
    throw new Error('La tarea pendiente ya no existe en este equipo');
  }

  const dto: CreateProcessDTO = {
    ...local.dto,
    fase: changes.fase,
    fechaInicio: changes.fechaInicio ?? local.dto.fechaInicio,
    fechaFin: changes.fechaFin ?? local.dto.fechaFin,
  };
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
    faseNombre: changes.fase,
  };

  const movidos = await indexedDBStorage.remapTaskId(local.proceso, real);
  await indexedDBStorage.upsertProceso(real);
  await indexedDBStorage.deleteLocalProcess(local.proceso);

  return { movidos };
}
