import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { createVirtualTimerEntry } from '../lib/timerVirtualEntry';
import { splitAvailability, MIN_SPLIT_MINUTES } from '../lib/splitEntry';
import { stopResultToNewEntryInput } from '../lib/newEntryInput';
import type { useTimer } from './useTimer';
import type { TimeTrackerBarHandle } from '../components/TimeTrackerBar';
import type { NewEntryInput, TimeEntry } from '../types';

export interface UseTimerViewParams {
  /** Persiste un Registro; el play handler lo usa al cerrar el timer anterior. */
  createEntry: (data: NewEntryInput) => Promise<unknown>;
  /** Timer activo de la app; la página lo comparte con el resto de hooks. */
  timer: ReturnType<typeof useTimer>;
  /** `true` cuando la fecha de hoy cae dentro del período visible. */
  todayInRange: boolean;
}

/** Fecha local en `YYYY-MM-DD`, sin pasar por UTC. */
function localDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Vista del Timer activo: la fila virtual de la lista, el elapsed con throttling,
 * el play handler, el handle de la barra y el motivo por el que el split del timer
 * está deshabilitado.
 *
 * Recibe el Timer activo ya resuelto (`useTimer` lo compone la página) y no
 * reimplementa nada del store ni de la lógica pura (`createVirtualTimerEntry`,
 * `splitAvailability`). La fila virtual sólo se expone cuando hoy cae dentro del
 * período visible. El comportamiento es el mismo que tenía la página.
 */
export function useTimerView({ createEntry, timer, todayInRange }: UseTimerViewParams) {
  const trackerBarRef = useRef<TimeTrackerBarHandle>(null);
  const pendingDescription = useRef<string | undefined>(undefined);

  /**
   * El timer en curso: la fecha y los horarios que se ofrecen son los reales, no
   * los que muestra la fila virtual (que enseña el reloj destripado a la hora).
   *
   * Depende de `elapsed` a propósito: `timerState` conserva su identidad mientras
   * el timer corre, así que sin esa dependencia la hora de fin se congelaría en el
   * instante de arranque y la división se ofrecería como no disponible.
   */
  const liveTimerEntry = useMemo<TimeEntry | null>(() => {
    const state = timer.timerState;
    if (!timer.isRunning || !state) return null;

    const start = new Date(state.startTime);
    const end = new Date();

    return {
      id: 'timer-activo',
      taskId: state.taskId,
      taskName: state.taskName,
      proceso: { proceso: state.taskId, nombre: state.taskName },
      date: localDateString(start),
      startTime: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
      endTime: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`,
      duration: Math.floor((end.getTime() - start.getTime()) / 1000),
      description: state.description,
      createdAt: state.startTime,
      updatedAt: state.startTime,
      synced: false,
    };
  }, [timer.isRunning, timer.timerState, timer.elapsed]);

  /**
   * Fecha de hoy mientras la página está montada. Se refresca al volver a la
   * pestaña para que el chequeo de "el timer arrancó hoy" no se quede congelado
   * si la página cruza la medianoche.
   */
  const [todayString, setTodayString] = useState(localDateString);

  useEffect(() => {
    const sync = () => setTodayString(localDateString());
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  const timerSplitDisabledReason = useMemo(() => {
    if (!liveTimerEntry) return undefined;
    if (liveTimerEntry.date !== todayString) {
      return 'El timer cruza la medianoche; al pararlo decidirás cómo dividirlo';
    }
    // Recién arrancado: el timer aún no llega al mínimo de dos minutos.
    if (createVirtualTimerEntry(timer.timerState!, new Date()).duration === 0) {
      return `Un Registro de menos de ${MIN_SPLIT_MINUTES} minutos no se puede dividir`;
    }
    const availability = splitAvailability(liveTimerEntry);
    return availability.splittable ? undefined : availability.reason;
  }, [liveTimerEntry, todayString, timer.timerState]);

  const virtualTimerEntry = useMemo(() => {
    if (!timer.isRunning || !timer.timerState) return null;
    if (!todayInRange) return null;
    return createVirtualTimerEntry(timer.timerState, new Date());
  }, [timer.isRunning, timer.timerState, timer.elapsed, todayInRange]);

  // Throttled elapsed for stats cards — updates every 5s to avoid re-rendering 4 cards every second
  const [throttledElapsed, setThrottledElapsed] = useState(0);
  const throttleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timer.isRunning) {
      // Sync immediately, then every 5 seconds
      setThrottledElapsed(timer.elapsed);
      throttleRef.current = setInterval(() => {
        setThrottledElapsed(timer.elapsed);
      }, 5000);
    } else {
      if (throttleRef.current) {
        clearInterval(throttleRef.current);
        throttleRef.current = null;
      }
      setThrottledElapsed(0);
    }
    return () => {
      if (throttleRef.current) {
        clearInterval(throttleRef.current);
        throttleRef.current = null;
      }
    };
  }, [timer.isRunning, timer.elapsed]);

  const handlePlayEntry = useCallback(async (entry: TimeEntry) => {
    if (timer.isRunning) {
      const result = await timer.stop({ persist: false });
      const stopped = stopResultToNewEntryInput(result, pendingDescription.current);
      if (stopped) {
        await createEntry(stopped);
        toast('Timer de ' + stopped.taskName + ' detenido. Iniciando ' + entry.taskName + '.');
      }
    }
    pendingDescription.current = entry.description;
    await timer.start(entry.taskId, entry.taskName, entry.description);
  }, [timer, createEntry]);

  return {
    trackerBarRef,
    pendingDescription,
    liveTimerEntry,
    virtualTimerEntry,
    throttledElapsed,
    timerSplitDisabledReason,
    handlePlayEntry,
  };
}
