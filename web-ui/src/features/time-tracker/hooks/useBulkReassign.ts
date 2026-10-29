import { useState, useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';
import type { Proceso, TimeEntry } from '../types';

export interface UseBulkReassignParams {
  entries: TimeEntry[];
  selectedIds: Set<string>;
  setSelectedIds: Dispatch<SetStateAction<Set<string>>>;
  updateEntry: (id: string, data: Partial<TimeEntry>) => Promise<TimeEntry | null>;
}

export interface UseBulkReassignReturn {
  reassignOpen: boolean;
  setReassignOpen: Dispatch<SetStateAction<boolean>>;
  /** Registros de la selección que se van a cambiar. */
  reassignableCount: number;
  /** Registros de la selección ya sincronizados: no se tocan (la BD ya tiene el proceso viejo). */
  skippedSyncedCount: number;
  handleReassign: (proceso: Proceso) => Promise<void>;
}

/**
 * Cambio de tarea en bloque para la selección de Registros.
 *
 * Sólo se reasignan los no sincronizados: el alta en SQL Server no es idempotente,
 * así que cambiar el proceso de una fila ya insertada dejaría la BD y lo local
 * diciendo cosas distintas.
 */
export function useBulkReassign({
  entries,
  selectedIds,
  setSelectedIds,
  updateEntry,
}: UseBulkReassignParams): UseBulkReassignReturn {
  const [reassignOpen, setReassignOpen] = useState(false);

  const selected = useMemo(
    () => entries.filter((e) => selectedIds.has(e.id)),
    [entries, selectedIds]
  );

  const reassignable = useMemo(() => selected.filter((e) => !e.synced), [selected]);

  const handleReassign = useCallback(
    async (proceso: Proceso) => {
      if (reassignable.length === 0) return;

      for (const entry of reassignable) {
        await updateEntry(entry.id, {
          taskId: proceso.proceso,
          taskName: proceso.nombre,
          proceso,
        });
      }

      const skipped = selected.length - reassignable.length;
      toast.success(
        `${reassignable.length} registro${reassignable.length !== 1 ? 's' : ''} cambiado${
          reassignable.length !== 1 ? 's' : ''
        } a ${proceso.nombre}` +
          (skipped > 0 ? ` · ${skipped} sincronizado(s) sin tocar` : '')
      );

      setSelectedIds(new Set());
      setReassignOpen(false);
    },
    [reassignable, selected.length, setSelectedIds, updateEntry]
  );

  return {
    reassignOpen,
    setReassignOpen,
    reassignableCount: reassignable.length,
    skippedSyncedCount: selected.length - reassignable.length,
    handleReassign,
  };
}
