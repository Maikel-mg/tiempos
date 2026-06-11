import { useState, useEffect, useCallback, useRef } from 'react';
import { TimeTrackingService } from '../services/timeTrackingService';
import { indexedDBStorage } from '@/lib/storage/IndexedDBStorage';
import type { TimerState } from '../types';

// Instancia del servicio
const service = new TimeTrackingService(indexedDBStorage);

/**
 * Calcula el elapsed real desde el reloj del sistema (no desde ticks).
 * Esto es inmune a throttling de setInterval en pestañas background.
 */
function computeElapsed(startTimeMs: number): number {
  return Math.floor((Date.now() - startTimeMs) / 1000);
}

/**
 * Hook para manejar el temporizador (start/stop).
 * Persiste el estado en IndexedDB y lo recupera al reopen del navegador.
 *
 * El elapsed se calcula desde el reloj del sistema (wall clock) en vez de
 * contar ticks de setInterval. Esto previene que el tiempo se desactualice
 * cuando la pestaña queda en background (browser throttles setTimeout/setInterval).
 */
export function useTimer() {
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeMsRef = useRef<number | null>(null);

  // Recuperar estado al montar el componente
  useEffect(() => {
    const recoverState = async () => {
      try {
        const state = await service.recoverTimerState();
        if (state) {
          setTimerState(state);
          startTimeMsRef.current = new Date(state.startTime).getTime();
          setElapsed(computeElapsed(startTimeMsRef.current));
        }
      } catch (error) {
        console.error('Error recovering timer state:', error);
      }
    };
    recoverState();
  }, []);

  // Timer tick — calcula elapsed desde wall clock, no desde ticks acumulados
  useEffect(() => {
    if (timerState?.isRunning && startTimeMsRef.current) {
      // Sync inmediato al iniciar
      setElapsed(computeElapsed(startTimeMsRef.current));

      intervalRef.current = setInterval(() => {
        if (startTimeMsRef.current) {
          setElapsed(computeElapsed(startTimeMsRef.current));
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState?.isRunning]);

  // Resync al volver a la pestaña — corrige throttling acumulado
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && timerState?.isRunning && startTimeMsRef.current) {
        setElapsed(computeElapsed(startTimeMsRef.current));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [timerState?.isRunning]);

  /**
   * Inicia el temporizador para una tarea.
   */
  const start = useCallback(async (taskId: number, taskName: string, description?: string) => {
    try {
      const state = await service.startTimer(taskId, taskName, description);
      startTimeMsRef.current = new Date(state.startTime).getTime();
      setTimerState(state);
      setElapsed(computeElapsed(startTimeMsRef.current));
    } catch (error) {
      console.error('Error starting timer:', error);
      throw error;
    }
  }, []);

  /**
   * Detiene el temporizador y crea un registro de tiempo.
   * @param options.persist Si es false, retorna start/end sin crear entrada.
   * @returns El TimeEntry creado, StopTimerResult si persist=false, o null
   */
  const stop = useCallback(async (options?: { persist?: boolean }) => {
    try {
      const result = await service.stopTimer(options);
      startTimeMsRef.current = null;
      setTimerState(null);
      setElapsed(0);
      return result;
    } catch (error) {
      console.error('Error stopping timer:', error);
      throw error;
    }
  }, []);

  /**
   * Actualiza la descripción del temporizador en ejecución.
   * Persiste en IndexedDB para que sobreviva navegación.
   */
  const updateDescription = useCallback(async (description: string) => {
    try {
      await service.updateTimerDescription(description);
      setTimerState((prev) =>
        prev ? { ...prev, description } : prev
      );
    } catch (error) {
      console.error('Error updating timer description:', error);
    }
  }, []);

  /**
   * Actualiza la hora de inicio del temporizador en ejecución.
   * Recalcula elapsed y persiste en IndexedDB.
   */
  const updateStartTime = useCallback(async (newStartTime: string) => {
    try {
      const newElapsed = await service.updateTimerStartTime(newStartTime);
      startTimeMsRef.current = new Date(newStartTime).getTime();
      setTimerState((prev) =>
        prev ? { ...prev, startTime: newStartTime, elapsed: newElapsed } : prev
      );
      setElapsed(computeElapsed(startTimeMsRef.current));
    } catch (error) {
      console.error('Error updating start time:', error);
      throw error;
    }
  }, []);

  /**
   * Cancela el temporizador sin crear registro.
   */
  const cancel = useCallback(async () => {
    try {
      await service.cancelTimer();
      startTimeMsRef.current = null;
      setTimerState(null);
      setElapsed(0);
    } catch (error) {
      console.error('Error cancelling timer:', error);
    }
  }, []);

  return {
    timerState,
    isRunning: timerState?.isRunning ?? false,
    elapsed,
    start,
    stop,
    updateStartTime,
    updateDescription,
    cancel
  };
}