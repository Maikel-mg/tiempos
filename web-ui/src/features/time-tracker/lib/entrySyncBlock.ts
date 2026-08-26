import type { TimeEntry } from '../types';

/** Mensaje mostrado cuando una entrada con Proceso Pendiente no es sincronizable. */
export const PENDING_SYNC_BLOCK_MESSAGE = 'Sincroniza primero los procesos pendientes';

/**
 * True si la Entrada de Tiempo referencia un Proceso Pendiente y por tanto
 * no se puede sincronizar hasta que el proceso exista en la BBDD.
 * Espejo de ProcessOfflineService.isTimeEntrySyncBlocked para uso en UI sin instanciar servicio.
 */
export function isTimeEntrySyncBlocked(entry: TimeEntry): boolean {
  if (entry.proceso?.esPendiente) return true;
  if (entry.proceso?.procesoPendienteId != null) return true;
  if (entry.taskId < 0) return true;
  if (entry.proceso?.proceso < 0) return true;
  return false;
}
