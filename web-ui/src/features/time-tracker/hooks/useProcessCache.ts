import { useState, useEffect, useCallback } from 'react';
import { wizardConfig } from '@/config/stores';
import { processOfflineService } from '../services/ProcessOfflineService';
import type { Proceso } from '../types';

/**
 * Fetches processes for the current usuario from the offline cache,
 * falling back to the backend when the cache is empty or on explicit refresh.
 * Reads wizardConfig.usuario internally — no props needed.
 */
export function useProcessCache() {
  const [processes, setProcesses] = useState<Proceso[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProcesses = useCallback(async (options: { refresh?: boolean } = {}) => {
    const usuario = wizardConfig.get()?.usuario ?? '';

    if (!usuario) {
      setProcesses([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Cached data resolves without a loading state: no flash of empty/loading.
    if (!options.refresh) {
      try {
        const lastUpdated = await processOfflineService.getLastUpdated(usuario);
        if (lastUpdated !== null) {
          const cached = await processOfflineService.getProcesses(usuario);
          setProcesses(cached);
          setError(null);
          return;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar procesos');
        setProcesses([]);
        return;
      }
    }

    try {
      setError(null);
      setLoading(true);
      const data = await processOfflineService.getProcesses(usuario, { refresh: true });
      setProcesses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar procesos');
      setProcesses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProcesses();
  }, [fetchProcesses]);

  const refresh = useCallback(() => fetchProcesses({ refresh: true }), [fetchProcesses]);

  return {
    processes,
    loading,
    error,
    refresh,
  };
}
