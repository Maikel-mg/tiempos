/**
 * The single writer for the running timer: talks to `timeTrackingService`
 * (IndexedDB) and mirrors the result into the `runningTimer` store.
 *
 * Kept outside React so the timer can be driven from anywhere — the TimeTracker
 * page (`useTimer`) and the global shortcut alike.
 */
import { TimeTrackingService } from '../services/timeTrackingService';
import type { StopTimerResult } from '../services/timeTrackingService';
import { indexedDBStorage } from '@/lib/storage/IndexedDBStorage';
import { runningTimer } from './runningTimer';
import { detectCrossing } from './timerCrossingDetector';
import type { TimeEntry, TimerState } from '../types';

const service = new TimeTrackingService(indexedDBStorage);

export type StartLastTaskResult =
  | { action: 'started'; taskName: string }
  | { action: 'no-previous-task' };

export type ToggleTimerResult =
  | StartLastTaskResult
  | { action: 'stopped'; taskName: string }
  | { action: 'blocked-midnight'; taskName: string };

/** Re-reads the persisted timer into the store (used once after a full reload). */
export async function hydrateFromStorage(): Promise<TimerState | null> {
  try {
    const state = await service.recoverTimerState();
    if (state) runningTimer.start(state);
    return state;
  } catch (error) {
    console.error('Error recovering timer state:', error);
    return null;
  }
}

export async function startTimer(
  taskId: number,
  taskName: string,
  description?: string,
): Promise<TimerState> {
  try {
    const state = await service.startTimer(taskId, taskName, description);
    runningTimer.start(state);
    return state;
  } catch (error) {
    console.error('Error starting timer:', error);
    throw error;
  }
}

export async function stopTimer(
  options?: { persist?: boolean },
): Promise<TimeEntry | StopTimerResult | null> {
  try {
    const result = await service.stopTimer(options);
    runningTimer.stop();
    return result;
  } catch (error) {
    console.error('Error stopping timer:', error);
    throw error;
  }
}

export async function cancelTimer(): Promise<void> {
  try {
    await service.cancelTimer();
    runningTimer.stop();
  } catch (error) {
    console.error('Error cancelling timer:', error);
  }
}

export async function updateTimerStartTime(newStartTime: string): Promise<number> {
  try {
    const elapsed = await service.updateTimerStartTime(newStartTime);
    runningTimer.retime(newStartTime);
    return elapsed;
  } catch (error) {
    console.error('Error updating start time:', error);
    throw error;
  }
}

export async function updateTimerDescription(description: string): Promise<void> {
  try {
    await service.updateTimerDescription(description);
    runningTimer.describe(description);
  } catch (error) {
    console.error('Error updating timer description:', error);
  }
}

/**
 * Starts the timer on the task of the most recently created entry.
 *
 * There is no "last process" config yet, and the `processRecents` table is not
 * populated by the app, so the last registered entry is the only real source of
 * "the task I was just doing".
 */
export async function startLastUsedTask(): Promise<StartLastTaskResult> {
  const entries = await service.getEntries();
  if (entries.length === 0) return { action: 'no-previous-task' };

  const last = entries.reduce((newest, entry) =>
    entry.createdAt > newest.createdAt ? entry : newest,
  );
  await startTimer(last.taskId, last.taskName);
  return { action: 'started', taskName: last.taskName };
}

/**
 * Toggles the timer from anywhere: stops it when running, otherwise starts it
 * on the last used task.
 *
 * A stop that would cross midnight is refused rather than persisted: the plain
 * stop path writes one entry whose duration is computed from the start and end
 * clock times, which comes out negative across midnight. Resolving that split
 * belongs to the TimeTracker (MidnightSplitModal), so the timer is left running
 * and the caller is told.
 */
export async function toggleTimer(): Promise<ToggleTimerResult> {
  const snapshot = runningTimer.getSnapshot();

  if (!snapshot.isRunning) {
    return startLastUsedTask();
  }

  const crossedMidnight = detectCrossing(new Date(snapshot.startTimeMs), new Date()).crossed;
  if (crossedMidnight) {
    return { action: 'blocked-midnight', taskName: snapshot.taskName };
  }

  await stopTimer();
  return { action: 'stopped', taskName: snapshot.taskName };
}
