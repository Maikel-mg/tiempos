import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import { wizardConfig, dbConfig } from '@/config/stores';
import { indexedDBStorage } from '@/lib/storage/IndexedDBStorage';
import { toProceso } from '../services/localTasksService';
import type { Proceso } from '../types';

/**
 * La caché es best-effort: si IndexedDB no está disponible (modo privado, jsdom)
 * se sigue funcionando sin ella en vez de romper la carga.
 */
async function readCache<T>(read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch {
    return fallback;
  }
}

/**
 * Fetches processes for the current usuario from the SP endpoint.
 * Reads wizardConfig.usuario internally — no props needed.
 *
 * La BD sólo es alcanzable dentro de la VPN, así que la lista se cachea en
 * IndexedDB y las tareas creadas sin conexión (`pendiente`) se mezclan al
 * principio para poder registrar tiempos igualmente.
 */
export function useProcessCache() {
  const [processes, setProcesses] = useState<Proceso[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * true cuando la última carga no pudo hablar con la BD y se usó la caché local.
   * undefined mientras no se sabe (primera carga en curso).
   */
  const [offline, setOffline] = useState<boolean | undefined>(undefined);

  const fetchProcesses = useCallback(async () => {
    const usuario = wizardConfig.get()?.usuario ?? '';

    setLoading(true);
    setError(null);

    const locales = (await readCache(() => indexedDBStorage.getLocalProcesses(), [])).map(toProceso);

    if (!usuario) {
      setProcesses(locales);
      setOffline(undefined);
      setLoading(false);
      return;
    }

    let remotos: Proceso[] = [];
    let fallo: string | null = null;

    try {
      const dbConf = dbConfig.get();
      const response = await apiClient.post<{ success: boolean; data: Proceso[]; message?: string }>(
        '/processes',
        {
          usured: usuario,
          server: dbConf?.server,
          database: dbConf?.database,
          username: dbConf?.username,
          password: dbConf?.password,
        }
      );

      if (response.success && response.data?.success) {
        remotos = response.data.data || [];
        await readCache(() => indexedDBStorage.upsertProcesos(remotos), undefined);
      } else {
        fallo = (response.success ? response.data?.message : response.message) || 'Error al cargar procesos';
      }
    } catch (err) {
      fallo = err instanceof Error ? err.message : 'Error al cargar procesos';
    }

    if (fallo) {
      // Sin VPN: se muestra la última lista conocida en lugar de dejar la pantalla vacía.
      const cache = await readCache(() => indexedDBStorage.getAllProcesos(), []);
      setProcesses([...locales, ...cache]);
      setError(cache.length > 0 ? null : fallo);
      setOffline(true);
    } else {
      setProcesses([...locales, ...remotos]);
      setOffline(false);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProcesses();
  }, [fetchProcesses]);

  return {
    processes,
    loading,
    error,
    offline,
    refresh: fetchProcesses,
  };
}
