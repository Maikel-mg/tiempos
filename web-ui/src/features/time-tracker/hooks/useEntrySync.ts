import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { dbConfig, wizardConfig } from '@/config/stores';
import { syncTimeEntries } from '../services/timeEntrySyncService';
import type { TimeEntry } from '../types';

export interface UseEntrySyncParams {
  /** Registros actuales; de aquí salen los pendientes de sincronizar. */
  entries: TimeEntry[];
  /** Registros seleccionados en la página; acotan lo que se sincroniza. */
  selectedIds: Set<string>;
  /** Marca en la capa local los ids que se sincronizaron con éxito. */
  markSynced: (ids: string[]) => Promise<void>;
  /**
   * Notifica los ids sincronizados con éxito. La página lo usa para invalidar el
   * deshacer de una división cuyas mitades ya no existen sólo en local.
   */
  onEntriesSynced?: (succeededIds: string[]) => void;
}

/**
 * Sincronización del time tracker: apertura del panel, Registros pendientes,
 * Registros a sincronizar (acotados por la selección) y handler de sincronización.
 *
 * La selección de filas no vive aquí; entra como `selectedIds`. El efecto de una
 * sincronización sobre el deshacer de una división tampoco: se delega en
 * `onEntriesSynced`. El comportamiento es el mismo que tenía la página.
 */
export function useEntrySync({
  entries,
  selectedIds,
  markSynced,
  onEntriesSynced,
}: UseEntrySyncParams) {
  const [syncPanelOpen, setSyncPanelOpen] = useState(false);

  const pendingEntries = useMemo(() => entries.filter((e) => !e.synced), [entries]);

  const entriesToSync = useMemo(() => {
    if (selectedIds.size === 0) return pendingEntries;
    return pendingEntries.filter((e) => selectedIds.has(e.id));
  }, [pendingEntries, selectedIds]);

  /** Sincroniza un Registro contra SQL Server y refleja el resultado en local. */
  const handleSyncEntry = useCallback(async (entry: TimeEntry) => {
    const dbConfigData = dbConfig.get();
    if (!dbConfigData || !dbConfigData.server || !dbConfigData.database) {
      toast.error('Falta configuración de base de datos');
      return;
    }
    const usuario = (() => {
      try {
        const stored = wizardConfig.get();
        return stored?.usuario ?? '';
      } catch { return ''; }
    })();
    const outcome = await syncTimeEntries([entry], dbConfigData, usuario);
    if (outcome.success && outcome.results.some(r => r.success)) {
      const succeededIds = outcome.results.filter(r => r.success).map(r => r.entryId);
      await markSynced(succeededIds);
      onEntriesSynced?.(succeededIds);
      toast.success(`Sincronizado: ${entry.taskName}`);
    } else {
      const error = outcome.results[0]?.error ?? 'Error desconocido';
      toast.error(`Error al sincronizar: ${error}`);
    }
  }, [markSynced, onEntriesSynced]);

  return {
    syncPanelOpen,
    setSyncPanelOpen,
    pendingEntries,
    entriesToSync,
    handleSyncEntry,
  };
}
