/**
 * Global, framework-agnostic store of the running timer.
 *
 * The authoritative timer state lives in IndexedDB and is owned by `useTimer`,
 * which is only mounted on the TimeTracker page. Tab-title and favicon feedback
 * must work from ANY page, so `useTimer` publishes here and the app-wide hooks
 * read from here.
 *
 * Module-level state survives in-app navigation (react-router does not reload
 * modules). After a full page reload it is re-hydrated from IndexedDB by
 * `useRunningTimer`.
 */

export interface RunningTimerSnapshot {
  isRunning: boolean;
  /** Epoch ms at which the timer started. 0 when stopped. */
  startTimeMs: number;
  taskName: string;
}

const STOPPED: RunningTimerSnapshot = {
  isRunning: false,
  startTimeMs: 0,
  taskName: '',
};

let snapshot: RunningTimerSnapshot = STOPPED;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export const runningTimer = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Returns a stable reference while unchanged — required by useSyncExternalStore. */
  getSnapshot(): RunningTimerSnapshot {
    return snapshot;
  },

  start(startTimeMs: number, taskName: string): void {
    if (
      snapshot.isRunning &&
      snapshot.startTimeMs === startTimeMs &&
      snapshot.taskName === taskName
    ) {
      return;
    }
    snapshot = { isRunning: true, startTimeMs, taskName };
    emit();
  },

  /** Re-anchors the start time after an edit, preserving the task name. */
  retime(startTimeMs: number): void {
    if (!snapshot.isRunning || snapshot.startTimeMs === startTimeMs) return;
    snapshot = { ...snapshot, startTimeMs };
    emit();
  },

  stop(): void {
    if (!snapshot.isRunning) return;
    snapshot = STOPPED;
    emit();
  },
};

/** Elapsed seconds since the given start, derived from the wall clock. */
export function secondsSince(startTimeMs: number): number {
  return Math.max(0, Math.floor((Date.now() - startTimeMs) / 1000));
}
