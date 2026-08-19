import type { TimeEntry } from '../types';

/**
 * Devuelve las entradas locales que referencian a un Proceso Pendiente
 * (taskId negativo igual al id del pendiente), tanto sincronizadas como no.
 */
export function findEntriesByPendingProcess(entries: TimeEntry[], pendienteId: number): TimeEntry[] {
  return entries.filter((e) => e.taskId === pendienteId);
}

/**
 * Devuelve las entradas afectadas por un renombrado de Proceso Pendiente con
 * el taskName actualizado a newName. No muta las entradas originales.
 */
export function propagateRename(entries: TimeEntry[], pendienteId: number, newName: string): TimeEntry[] {
  return findEntriesByPendingProcess(entries, pendienteId).map((e) => ({ ...e, taskName: newName }));
}
