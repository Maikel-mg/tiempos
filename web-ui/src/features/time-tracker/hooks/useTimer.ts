import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { runningTimer, secondsSince } from '../lib/runningTimer';
import * as timerActions from '../lib/timerActions';
import type { TimerState } from '../types';

/**
 * Adapter over the app-wide timer store, for the TimeTracker page.
 *
 * The timer itself is owned by `timerActions` + `runningTimer`, so a start/stop
 * triggered elsewhere (the global shortcut) is reflected here automatically.
 * Elapsed is derived from the system clock instead of accumulated ticks, which
 * keeps it correct when the browser throttles intervals in background tabs.
 */
export function useTimer() {
  const snapshot = useSyncExternalStore(
    runningTimer.subscribe,
    runningTimer.getSnapshot,
    runningTimer.getSnapshot,
  );
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!snapshot.isRunning) {
      setElapsed(0);
      return;
    }

    const sync = () => setElapsed(secondsSince(snapshot.startTimeMs));
    sync();
    const interval = setInterval(sync, 1000);
    document.addEventListener('visibilitychange', sync);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [snapshot.isRunning, snapshot.startTimeMs]);

  // Intentionally memoized on the identity fields only: consumers such as
  // TimeTrackerBar key effects on `timerState`, so a fresh object on every
  // render (this hook re-renders while the parent ticks) would thrash them.
  // The live clock is the separate `elapsed` value returned below.
  const { isRunning, taskId, taskName, startTime, description, startTimeMs } = snapshot;
  const timerState: TimerState | null = useMemo(
    () =>
      isRunning
        ? {
            isRunning: true,
            taskId,
            taskName,
            startTime,
            elapsed: secondsSince(startTimeMs),
            description,
          }
        : null,
    [isRunning, taskId, taskName, startTime, description, startTimeMs],
  );

  const start = useCallback(
    async (taskId: number, taskName: string, description?: string): Promise<void> => {
      await timerActions.startTimer(taskId, taskName, description);
    },
    [],
  );

  const stop = useCallback(
    (options?: { persist?: boolean }) => timerActions.stopTimer(options),
    [],
  );

  const updateStartTime = useCallback(
    async (newStartTime: string): Promise<void> => {
      await timerActions.updateTimerStartTime(newStartTime);
    },
    [],
  );

  const updateDescription = useCallback(
    (description: string) => timerActions.updateTimerDescription(description),
    [],
  );

  const cancel = useCallback(() => timerActions.cancelTimer(), []);

  return {
    timerState,
    isRunning: snapshot.isRunning,
    elapsed,
    start,
    stop,
    updateStartTime,
    updateDescription,
    cancel,
  };
}
