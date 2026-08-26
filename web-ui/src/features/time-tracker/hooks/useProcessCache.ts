import { useState, useEffect, useCallback } from 'react';
import { wizardConfig } from '@/config/stores';
import { processOfflineService } from '../services/ProcessOfflineService';
import type { Proceso } from '../types';

/**
 * Fetches processes for the current usuario from the selected offline project
 * trees. Reads wizardConfig.usuario internally — no props needed.
 */
export function useProcessCache() {
  const [processes, setProcesses] = useState<Proceso[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProcesses = useCallback(async () => {
    const usuario = wizardConfig.get()?.usuario ?? '';

    if (!usuario) {
      setProcesses([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const data = await processOfflineService.getOfflineProcesses(usuario);
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

  const refresh = useCallback(() => fetchProcesses(), [fetchProcesses]);

  return {
    processes,
    loading,
    error,
    refresh,
  };
}
