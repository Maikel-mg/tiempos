import { useEffect, useState, useSyncExternalStore } from 'react';
import { runningTimer, secondsSince } from '@/features/time-tracker/lib/runningTimer';
import { timeTrackingService } from '@/features/time-tracker/services/timeTrackingService';

export interface RunningTimerInfo {
  isRunning: boolean;
  elapsed: number;
  taskName: string;
}

/**
 * App-wide, read-only view of the running timer.
 *
 * Complements `useTimer` (mounted only on the TimeTracker page, where it owns
 * start/stop): this hook works from any route and after a full reload, so
 * global surfaces such as the tab title can depend on it.
 */
export function useRunningTimer(): RunningTimerInfo {
  const snapshot = useSyncExternalStore(
    runningTimer.subscribe,
    runningTimer.getSnapshot,
    runningTimer.getSnapshot,
  );
  const [elapsed, setElapsed] = useState(0);

  // Re-hydrate after a full reload: nothing has published yet, but a timer may
  // still be running in IndexedDB.
  useEffect(() => {
    if (runningTimer.getSnapshot().isRunning) return;

    let active = true;
    timeTrackingService
      .recoverTimerState()
      .then((state) => {
        if (active && state?.isRunning) {
          runningTimer.start(new Date(state.startTime).getTime(), state.taskName);
        }
      })
      .catch((error) => {
        // Non-critical: the tab badge is purely informational. Logged anyway
        // per WEB_ARCHITECTURE.md ("Manejo de errores", Regla 6).
        console.error('Error recovering timer state for the tab badge:', error);
      });

    return () => {
      active = false;
    };
  }, []);

  // Elapsed is derived from the wall clock instead of accumulated ticks, so it
  // stays correct when the browser throttles intervals in background tabs.
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

  return {
    isRunning: snapshot.isRunning,
    elapsed,
    taskName: snapshot.taskName,
  };
}
