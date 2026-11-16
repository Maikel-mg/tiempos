import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { dbConfig, wizardConfig } from '@/config/stores';
import {
  addMarcajeManual,
  deleteMarcajeManual,
  readMarcajesCache,
  saveMarcajesLeidos,
  setMarcajesIgnorado,
  updateMarcajeManual,
} from '@/lib/storage/marcajesStorage';
import type { MarcajeDiaRow } from '@/lib/storage/IndexedDBStorage';
import { groupMarcajesByDay, type DayMarcajes, type Marcaje } from '../lib/marcajes';

/** Pasado este tiempo, lo pintado desde la caché se etiqueta como dato viejo. */
const UN_DIA_MS = 24 * 60 * 60 * 1000;

/** Los Marcajes de un día y lo que la Agenda sabe de ellos. */
export interface MarcajeDia extends DayMarcajes {
  /** Vienen de una lectura de hace más de un día. */
  stale: boolean;
  /** El usuario excluyó el día del cuadre. */
  ignored: boolean;
}

export interface MarcajesPeriodo {
  /** Estado por día del período visible, aunque no haya Marcajes. */
  byDay: Map<string, MarcajeDia>;
  /** Se está refrescando en segundo plano: la primera pintura no espera. */
  isRefreshing: boolean;
  /** Sin red o sin configuración: el cuadre sigue con la caché. */
  error: string | null;
  addManual: (day: string, time: string) => Promise<void>;
  updateManual: (day: string, fromTime: string, toTime: string) => Promise<void>;
  removeManual: (day: string, time: string) => Promise<void>;
  setIgnored: (day: string, ignored: boolean) => Promise<void>;
}

async function fetchMarcajes(from: string, to: string): Promise<Marcaje[]> {
  const config = dbConfig.get();
  if (!config?.server || !config?.database) {
    throw new Error('Falta la configuración de la base de datos');
  }
  const usured = wizardConfig.get()?.usuario ?? '';
  if (!usured) {
    throw new Error('Falta el usuario en Configuración');
  }

  const response = await apiClient.post<{ success: boolean; data: Marcaje[]; message?: string }>('/marcajes', {
    server: config.server,
    database: config.database,
    username: config.username,
    password: config.password || '',
    startDate: from,
    endDate: to,
    usured,
  });

  if (!response.success) {
    throw new Error(response.message);
  }
  if (!response.data?.success) {
    throw new Error(response.data?.message || 'No se pudieron leer los marcajes');
  }
  return response.data.data ?? [];
}

/**
 * Marcajes del período visible: primero la caché local, luego el refresco en
 * segundo plano. Sin VPN el cuadre sigue funcionando con lo guardado, y si no
 * hay nada guardado los días se quedan sin información en vez de en error.
 */
export function useMarcajesPeriodo(days: string[]): MarcajesPeriodo {
  const from = days[0];
  const to = days[days.length - 1];
  const [cache, setCache] = useState<{ marcajes: Marcaje[]; dias: MarcajeDiaRow[] }>({
    marcajes: [],
    dias: [],
  });
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(async () => {
    if (!from || !to) {
      setCache({ marcajes: [], dias: [] });
      return;
    }
    setCache(await readMarcajesCache(from, to));
  }, [from, to]);

  useEffect(() => {
    void reload().catch(() => setCache({ marcajes: [], dias: [] }));
  }, [reload, reloadToken]);

  const query = useQuery<Marcaje[]>({
    queryKey: ['marcajes', from, to],
    enabled: Boolean(from && to),
    // Los marcajes de un día pasado ya no cambian; los de hoy, sí.
    staleTime: 5 * 60 * 1000,
    // Sin red no hay nada que reintentar en bucle: se sigue con la caché.
    retry: false,
    queryFn: async () => {
      const marcajes = await fetchMarcajes(from, to);
      await saveMarcajesLeidos(marcajes, days);
      return marcajes;
    },
  });

  // Lo leído de la intranet entra en la caché; la pintura sale siempre de ahí.
  useEffect(() => {
    if (query.data) void reload().catch(() => undefined);
  }, [query.data, reload]);

  const byDay = useMemo(() => {
    const grouped = groupMarcajesByDay(cache.marcajes.filter((marcaje) => days.includes(marcaje.date)));
    const readByDay = new Map(cache.dias.map((dia) => [dia.date, dia]));
    const now = Date.now();
    const map = new Map<string, MarcajeDia>();

    for (const day of days) {
      const found = grouped.find((group) => group.day === day);
      const row = readByDay.get(day);
      const readAt = row?.readAt ? new Date(row.readAt).getTime() : null;
      const stale = readAt !== null ? now - readAt > UN_DIA_MS : Boolean(found?.marcajes.length);
      map.set(day, {
        day,
        times: found?.times ?? [],
        coveredMinutes: found?.coveredMinutes ?? 0,
        marcajes: found?.marcajes ?? [],
        stale,
        ignored: Boolean(row?.ignored),
      });
    }

    return map;
  }, [cache, days]);

  const reloadAfterWrite = useCallback(async () => {
    setReloadToken((token) => token + 1);
  }, []);

  const addManual = useCallback(
    async (day: string, time: string) => {
      await addMarcajeManual(day, time);
      await reloadAfterWrite();
    },
    [reloadAfterWrite],
  );

  const updateManual = useCallback(
    async (day: string, fromTime: string, toTime: string) => {
      await updateMarcajeManual(day, fromTime, toTime);
      await reloadAfterWrite();
    },
    [reloadAfterWrite],
  );

  const removeManual = useCallback(
    async (day: string, time: string) => {
      await deleteMarcajeManual(day, time);
      await reloadAfterWrite();
    },
    [reloadAfterWrite],
  );

  const setIgnored = useCallback(
    async (day: string, ignored: boolean) => {
      await setMarcajesIgnorado(day, ignored);
      await reloadAfterWrite();
    },
    [reloadAfterWrite],
  );

  return {
    byDay,
    isRefreshing: query.isFetching,
    error: query.error ? (query.error as Error).message : null,
    addManual,
    updateManual,
    removeManual,
    setIgnored,
  };
}
