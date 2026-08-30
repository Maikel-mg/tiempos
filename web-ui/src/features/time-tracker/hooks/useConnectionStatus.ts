import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { dbConfig, connectivityConfig } from '@/config/stores';

export type ConnectionStatus = 'connected' | 'disconnected' | 'checking';

export interface ConnectionStatusState {
  status: ConnectionStatus;
  lastCheckedAt: number | null;
  refresh: () => Promise<void>;
}

function getPollingIntervalMinutes(): number {
  const cfg = connectivityConfig.get();
  const raw = cfg?.pollingIntervalMinutes ?? 5;
  if (!Number.isFinite(raw)) return 5;
  return Math.min(30, Math.max(1, Math.floor(raw)));
}

function getDbPayload(): Record<string, string> | null {
  const cfg = dbConfig.get();
  if (!cfg) return null;
  return {
    server: cfg.server ?? '',
    database: cfg.database ?? '',
    username: cfg.username ?? '',
    password: cfg.password ?? '',
  };
}

/**
 * Hook que mantiene el estado de conexión a la BBDD mediante polling de /test-connection.
 * - Intervalo configurable vía connectivityConfig (1–30 min, default 5).
 * - Solo hace polling cuando la pestaña está visible; pausa en segundo plano y
 *   comprueba inmediatamente al volver.
 * - No usa navigator.onLine.
 */
export function useConnectionStatus(): ConnectionStatusState {
  const [status, setStatus] = useState<ConnectionStatus>('checking');
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  const checkConnection = useCallback(async () => {
    // No bloquear UI con checking si ya tenemos un estado previo? Siempre ponemos checking al inicio de la comprobación?
    // Para visibilidad, mantenemos status previo hasta resultado; solo ponemos checking si es la primera vez.
    // Mejor: si estamos en checking ya, no cambiar; si no, temporary checking? Spec says indicador muestra conectado / sin conexión.
    // Mantendremos transiciones: ponemos checking brevemente? Simplificamos: no ponemos checking en polls periódicos, solo al primer mount.
    // Pero para refresh manual sí ponemos checking.
    try {
      const payload = getDbPayload();
      // Si no hay configuración, consideramos sin conexión sin hacer request (evita spam).
      if (!payload || !payload.server || !payload.database || !payload.username) {
        if (isMountedRef.current) {
          setStatus('disconnected');
          setLastCheckedAt(Date.now());
        }
        return;
      }
      const result = await apiClient.post<{ success: boolean; message: string }>('/test-connection', payload);
      if (!isMountedRef.current) return;
      if (result.success) {
        setStatus('connected');
      } else {
        setStatus('disconnected');
      }
      setLastCheckedAt(Date.now());
    } catch {
      if (!isMountedRef.current) return;
      setStatus('disconnected');
      setLastCheckedAt(Date.now());
    }
  }, []);

  const refresh = useCallback(async () => {
    setStatus('checking');
    await checkConnection();
  }, [checkConnection]);

  useEffect(() => {
    isMountedRef.current = true;

    // Check inmediato al montar
    void checkConnection();

    const startPolling = () => {
      stopPolling();
      const intervalMs = getPollingIntervalMinutes() * 60 * 1000;
      intervalRef.current = setInterval(() => {
        if (document.visibilityState === 'visible') {
          void checkConnection();
        }
      }, intervalMs);
    };

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    startPolling();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Al volver, comprobar inmediatamente y reiniciar intervalo
        void checkConnection();
        startPolling();
      } else {
        stopPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Reaccionar a cambios de intervalo en Settings sin recargar
    const unsubscribe = connectivityConfig.subscribe(() => {
      if (document.visibilityState === 'visible') {
        startPolling();
      }
    });

    return () => {
      isMountedRef.current = false;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      unsubscribe();
    };
  }, [checkConnection]);

  return { status, lastCheckedAt, refresh };
}
