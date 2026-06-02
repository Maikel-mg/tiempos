import { useState, useEffect, useCallback, useRef } from 'react';
import { TimeTrackingService } from '../services/timeTrackingService';
import { indexedDBStorage } from '@/lib/storage/IndexedDBStorage';
import type { TimerState } from '../types';

// Instancia del servicio
const service = new TimeTrackingService(indexedDBStorage);

/**
 * Hook para manejar el temporizador (start/stop).
 * Persiste el estado en IndexedDB y lo recupera al reopen del navegador.
 */
export function useTimer() {
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Recuperar estado al montar el componente
  useEffect(() => {
    const recoverState = async () => {
      try {
        const state = await service.recoverTimerState();
        if (state) {
          setTimerState(state);
          setElapsed(state.elapsed);
        }
      } catch (error) {
        console.error('Error recovering timer state:', error);
      }
    };
    recoverState();
  }, []);

  // Timer tick
  useEffect(() => {
    if (timerState?.isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
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

  /**
   * Inicia el temporizador para una tarea.
   */
  const start = useCallback(async (taskId: number, taskName: string) => {
    try {
      const state = await service.startTimer(taskId, taskName);
      setTimerState(state);
      setElapsed(0);
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
      if (options?.persist === false) {
        setTimerState(null);
        setElapsed(0);
        return result;
      }
      setTimerState(null);
      setElapsed(0);
      return result;
    } catch (error) {
      console.error('Error stopping timer:', error);
      throw error;
    }
  }, []);

  /**
   * Cancela el temporizador sin crear registro.
   */
  const cancel = useCallback(async () => {
    try {
      await service.cancelTimer();
      setTimerState(null);
      setElapsed(0);
    } catch (error) {
      console.error('Error cancelling timer:', error);
      throw error;
    }
  }, []);

  return {
    timerState,
    isRunning: timerState?.isRunning ?? false,
    elapsed,
    start,
    stop,
    cancel
  };
}