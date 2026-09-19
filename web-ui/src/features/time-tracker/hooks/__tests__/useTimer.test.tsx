import 'fake-indexeddb/auto';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTimer } from '../useTimer';
import { startTimer, stopTimer } from '../../lib/timerActions';
import { runningTimer } from '../../lib/runningTimer';
import { indexedDBStorage } from '@/lib/storage/IndexedDBStorage';

describe('useTimer', () => {
  beforeEach(async () => {
    runningTimer.stop();
    await indexedDBStorage.clearTimerState();
    for (const entry of await indexedDBStorage.getAllEntries()) {
      await indexedDBStorage.deleteEntry(entry.id);
    }
  });

  afterEach(() => {
    // Unmount before touching the global store, otherwise the emission would
    // update a still-mounted hook outside act().
    cleanup();
    vi.useRealTimers();
    runningTimer.stop();
  });

  it('reflects a start made outside the hook (global shortcut)', async () => {
    const { result } = renderHook(() => useTimer());
    expect(result.current.isRunning).toBe(false);

    await act(async () => {
      await startTimer(202, 'Externa');
    });

    expect(result.current.isRunning).toBe(true);
    expect(result.current.timerState).toMatchObject({ taskId: 202, taskName: 'Externa' });
  });

  it('reflects a stop made outside the hook', async () => {
    const { result } = renderHook(() => useTimer());

    await act(async () => {
      await startTimer(101, 'Tarea');
    });
    await act(async () => {
      await stopTimer();
    });

    expect(result.current.isRunning).toBe(false);
    expect(result.current.timerState).toBeNull();
  });

  it('keeps the timerState reference stable across re-renders', async () => {
    // Regression guard: TimeTrackerBar keys an effect on timerState identity, so
    // a fresh object per render would loop through setTask/setDescription.
    const { result, rerender } = renderHook(() => useTimer());

    await act(async () => {
      await startTimer(101, 'Tarea');
    });
    const first = result.current.timerState;

    rerender();
    rerender();

    expect(result.current.timerState).toBe(first);
  });

  it('ticks elapsed while running', () => {
    vi.useFakeTimers();
    runningTimer.start({
      isRunning: true,
      taskId: 1,
      taskName: 'Tarea',
      startTime: new Date(Date.now() - 1_000).toISOString(),
      elapsed: 0,
    });

    const { result } = renderHook(() => useTimer());
    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(result.current.elapsed).toBeGreaterThanOrEqual(3);
  });
});
