import { useCallback, useEffect, useState } from 'react';
import { wizardConfig, connectivityConfig } from '@/config/stores';
import { processOfflineService } from '../services/ProcessOfflineService';
import { useConnectionStatus, type ConnectionStatus } from './useConnectionStatus';
import { isCacheStale, getCacheAgeDays } from '../lib/freshness';

export interface OfflineIndicatorState {
  pendingCount: number;
  lastUpdated: number | null;
  connectionStatus: ConnectionStatus;
  lastCheckedAt: number | null;
  isStale: boolean;
  staleDays: number | null;
  loading: boolean;
  refreshConnection: () => Promise<void>;
  refresh: () => Promise<void>;
}

function getUsured(): string {
  return wizardConfig.get()?.usuario ?? '';
}

function getFreshnessThreshold(): number {
  const cfg = connectivityConfig.get();
  const raw = cfg?.freshnessThresholdDays ?? 7;
  if (!Number.isFinite(raw)) return 7;
  return Math.min(30, Math.max(1, Math.floor(raw)));
}

/**
 * Agrega estado global offline: pendientes, última actualización, frescura y
 * estado de conexión (via useConnectionStatus).
 * - Re-fetch de pendientes/lastUpdated al montar, al cambiar usuario,
 *   al volver la pestaña visible y periódicamente (30s) para reflejar cambios
 *   locales sin recargar.
 * - isStale y staleDays derivan de lastUpdated + umbral configurable.
 * - El aviso ámbar nunca bloquea (solo indicador).
 */
export function useOfflineIndicator(): OfflineIndicatorState {
  const connection = useConnectionStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [freshnessThreshold, setFreshnessThreshold] = useState(getFreshnessThreshold);

  const load = useCallback(async () => {
    const usured = getUsured();
    if (!usured) {
      setPendingCount(0);
      setLastUpdated(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [pendings, lu] = await Promise.all([
        processOfflineService.getPendingProcesses(usured),
        processOfflineService.getLastUpdated(usured),
      ]);
      setPendingCount(pendings.length);
      setLastUpdated(lu);
    } catch {
      setPendingCount(0);
      setLastUpdated(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();

    // Refetch periódico ligero para captar cambios de pendientes creados en otra vista
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 30_000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const unsubWizard = wizardConfig.subscribe(() => void load());
    const unsubConnectivity = connectivityConfig.subscribe(() => {
      setFreshnessThreshold(getFreshnessThreshold());
    });

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      unsubWizard();
      unsubConnectivity();
    };
  }, [load]);

  const isStale = isCacheStale(lastUpdated, freshnessThreshold);
  const staleDays = getCacheAgeDays(lastUpdated);

  return {
    pendingCount,
    lastUpdated,
    connectionStatus: connection.status,
    lastCheckedAt: connection.lastCheckedAt,
    isStale,
    staleDays,
    loading,
    refreshConnection: connection.refresh,
    refresh: load,
  };
}
