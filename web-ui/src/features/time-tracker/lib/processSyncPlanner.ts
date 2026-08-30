import { normalizeForMatch } from '@/lib/normalize';
import type { Proceso, ProcesoPendiente, ProcessDuplicate, ProcessSyncPlan } from '../types';

/**
 * Función pura que planifica el Sync de Procesos (T6).
 * Decide pull (sistema no local), push (pendientes) y duplicados por nombre.
 *
 * - pull: procesos del sistema cuyo NProceso no está en local y cuyo nombre
 *   normalizado no coincide con ningún pendiente (evita duplicar un sistema que
 *   ya será resuelto como duplicado).
 * - duplicates: cada pendiente cuyo nombre normalizado coincide con un proceso
 *   del sistema (primer match).
 * - push: pendientes que NO son duplicados.
 */
export function planProcessSync(
  systemProcesses: Proceso[],
  localProcesses: Proceso[],
  pendingProcesses: ProcesoPendiente[]
): ProcessSyncPlan {
  const localIds = new Set(localProcesses.map((p) => p.proceso));

  // Index system by normalized name for duplicate detection (first occurrence)
  const systemByNormalizedName = new Map<string, Proceso>();
  for (const sp of systemProcesses) {
    const key = normalizeForMatch(sp.nombre);
    if (!systemByNormalizedName.has(key)) {
      systemByNormalizedName.set(key, sp);
    }
  }

  const duplicates: ProcessDuplicate[] = [];
  const duplicatePendingIds = new Set<number>();
  const duplicateSystemNormalized = new Set<string>();

  for (const pending of pendingProcesses) {
    const key = normalizeForMatch(pending.nombre);
    const system = systemByNormalizedName.get(key);
    if (system) {
      duplicates.push({ pending, system });
      duplicatePendingIds.add(pending.id);
      duplicateSystemNormalized.add(key);
    }
  }

  const push = pendingProcesses.filter((p) => !duplicatePendingIds.has(p.id));

  const pull = systemProcesses.filter((sp) => {
    if (localIds.has(sp.proceso)) return false;
    const key = normalizeForMatch(sp.nombre);
    if (duplicateSystemNormalized.has(key)) return false;
    return true;
  });

  return { pull, push, duplicates };
}
