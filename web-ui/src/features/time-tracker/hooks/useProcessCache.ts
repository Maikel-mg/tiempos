import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { wizardConfig, dbConfig } from '@/config/stores';
import { indexedDBStorage } from '@/lib/storage/IndexedDBStorage';
import { toProceso } from '../services/localTasksService';
import type { Proceso } from '../types';

/**
 * Los procesos cambian poco y la consulta es cara (abre conexión nueva contra SQL
 * Server), así que se comparte entre todos los consumidores —barra del tracker,
 * selector del editor, Mis Tareas— y se considera fresca durante unos minutos.
 */
const STALE_TIME_MS = 5 * 60_000;

interface ProcessesData {
  remotos: Proceso[];
  /** true si la última carga no pudo hablar con la BD y se usó la caché local. */
  offline: boolean;
  /** Motivo del fallo; sólo se muestra si no hay nada cacheado que enseñar. */
  error: string | null;
}

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

async function loadProcesses(usuario: string): Promise<ProcessesData> {
  if (!usuario) {
    return { remotos: [], offline: false, error: null };
  }

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
      const remotos = response.data.data || [];
      await readCache(() => indexedDBStorage.upsertProcesos(remotos), undefined);
      return { remotos, offline: false, error: null };
    }

    return {
      remotos: [],
      offline: true,
      error: (response.success ? response.data?.message : response.message) || 'Error al cargar procesos',
    };
  } catch (err) {
    return {
      remotos: [],
      offline: true,
      error: err instanceof Error ? err.message : 'Error al cargar procesos',
    };
  }
}

/**
 * Procesos disponibles para registrar tiempos.
 *
 * Pinta de inmediato lo que hay guardado en el navegador (última lista de la BD +
 * tareas creadas sin conexión) y sólo después habla con la BD, así abrir el
 * selector no cuesta un round-trip. Sin conexión se queda con la caché.
 */
export function useProcessCache() {
  const usuario = wizardConfig.get()?.usuario ?? '';
  const [cacheados, setCacheados] = useState<Proceso[]>([]);
  const [locales, setLocales] = useState<Proceso[]>([]);

  const loadLocal = useCallback(async () => {
    setLocales((await readCache(() => indexedDBStorage.getLocalProcesses(), [])).map(toProceso));
    setCacheados(await readCache(() => indexedDBStorage.getAllProcesos(), []));
  }, []);

  useEffect(() => {
    loadLocal();
  }, [loadLocal]);

  const { data, isPending, refetch } = useQuery({
    queryKey: ['processes', usuario],
    queryFn: () => loadProcesses(usuario),
    staleTime: STALE_TIME_MS,
  });

  const processes = useMemo(
    () => [
      ...locales,
      // Si la BD falló se sigue mostrando la última lista guardada en el navegador.
      ...(data && !data.offline ? data.remotos : cacheados),
    ],
    [locales, data, cacheados]
  );

  /** Fuerza volver a leer la BD y el navegador (tras crear o materializar tareas). */
  const refresh = useCallback(async () => {
    await Promise.all([refetch(), loadLocal()]);
  }, [refetch, loadLocal]);

  return {
    processes,
    loading: isPending && processes.length === 0,
    error: data?.error && processes.length === 0 ? data.error : null,
    offline: data?.offline,
    refresh,
  };
}
