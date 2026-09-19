/**
 * App-wide store of the running timer.
 *
 * The authoritative state is persisted in IndexedDB by `timeTrackingService`;
 * this store mirrors it in memory so every surface — the TimeTracker page, the
 * tab title, the global shortcut — reads one source of truth. It is written
 * only by `timerActions`, never directly by components.
 *
 * Module-level state survives in-app navigation (react-router does not reload
 * modules). After a full page reload it is re-hydrated from IndexedDB by
 * `useRunningTimer`.
 */
import type { TimerState } from '../types';

export interface RunningTimerSnapshot {
  isRunning: boolean;
  /** Epoch ms of the start, for wall-clock ticking. 0 when stopped. */
  startTimeMs: number;
  /** Start time exactly as persisted — never re-derived, to avoid timezone drift. */
  startTime: string;
  taskId: number;
  taskName: string;
  description?: string;
}

const STOPPED: RunningTimerSnapshot = {
  isRunning: false,
  startTimeMs: 0,
  startTime: '',
  taskId: 0,
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

  start(state: TimerState): void {
    const startTimeMs = new Date(state.startTime).getTime();
    if (
      snapshot.isRunning &&
      snapshot.startTimeMs === startTimeMs &&
      snapshot.taskId === state.taskId &&
      snapshot.taskName === state.taskName &&
      snapshot.description === state.description
    ) {
      return;
    }
    snapshot = {
      isRunning: true,
      startTimeMs,
      startTime: state.startTime,
      taskId: state.taskId,
      taskName: state.taskName,
      description: state.description,
    };
    emit();
  },

  /** Re-anchors the start time after an edit, preserving the rest of the state. */
  retime(startTime: string): void {
    if (!snapshot.isRunning) return;
    const startTimeMs = new Date(startTime).getTime();
    if (snapshot.startTime === startTime && snapshot.startTimeMs === startTimeMs) return;
    snapshot = { ...snapshot, startTime, startTimeMs };
    emit();
  },

  /** Updates the running timer's description in place. */
  describe(description: string): void {
    if (!snapshot.isRunning || snapshot.description === description) return;
    snapshot = { ...snapshot, description };
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
