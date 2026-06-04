import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { wizardConfig } from '@/config/stores';
import type { Proceso } from '../types';

/**
 * Fetches processes for the current usuario from the SP endpoint.
 * Reads wizardConfig.usuario internally — no props needed.
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
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<Proceso[]>(
        `/api/processes?usured=${encodeURIComponent(usuario)}`
      );

      if (response.success) {
        setProcesses(response.data);
      } else {
        setError(response.message || 'Error al cargar procesos');
        setProcesses([]);
      }
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

  return {
    processes,
    loading,
    error,
    refresh: fetchProcesses,
  };
}
