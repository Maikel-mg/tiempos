import { useState, useEffect, useCallback } from 'react';
import { wizardConfig } from '@/config/stores';
import { processOfflineService } from '@/features/time-tracker/services/ProcessOfflineService';
import type { Proceso, ProcesoPendiente } from '@/features/time-tracker/types';

function getUsured(): string {
  return wizardConfig.get()?.usuario ?? '';
}

/**
 * Manages the Procesos Pendientes of the current usuario (wizardConfig.usuario).
 * Loads both the raw pending records (`pendingProcesses`) and their Proceso
 * projection for the selector (`pendingProcesos`), and exposes CRUD wrappers
 * that reload the list after each mutation.
 */
export function usePendingProcesses() {
  const [pendingProcesos, setPendingProcesos] = useState<Proceso[]>([]);
  const [pendingProcesses, setPendingProcesses] = useState<ProcesoPendiente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const usured = getUsured();
    if (!usured) {
      setPendingProcesos([]);
      setPendingProcesses([]);
      setLoading(false);
      setError(null);
      return;
    }
    try {
      setLoading(true);
      const [pendientes, asProcesos] = await Promise.all([
        processOfflineService.getPendingProcesses(usured),
        processOfflineService.getPendingProcessesAsProcesos(usured),
      ]);
      setPendingProcesses(pendientes);
      setPendingProcesos(asProcesos);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar procesos pendientes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(
    async (input: Omit<ProcesoPendiente, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProcesoPendiente> => {
      const created = await processOfflineService.createPendingProcess(getUsured(), input);
      await load();
      return created;
    },
    [load]
  );

  const update = useCallback(
    async (
      id: number,
      patch: Partial<Omit<ProcesoPendiente, 'id' | 'createdAt' | 'updatedAt'>>
    ): Promise<ProcesoPendiente | null> => {
      const updated = await processOfflineService.updatePendingProcess(getUsured(), id, patch);
      await load();
      return updated;
    },
    [load]
  );

  const remove = useCallback(
    async (id: number): Promise<void> => {
      await processOfflineService.deletePendingProcess(getUsured(), id);
      await load();
    },
    [load]
  );

  return {
    pendingProcesos,
    pendingProcesses,
    loading,
    error,
    reload: load,
    create,
    update,
    remove,
  };
}
