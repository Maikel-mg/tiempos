import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runningTimer, secondsSince } from '../runningTimer';

describe('runningTimer', () => {
  beforeEach(() => {
    runningTimer.stop();
  });

  it('starts stopped', () => {
    expect(runningTimer.getSnapshot()).toEqual({
      isRunning: false,
      startTimeMs: 0,
      taskName: '',
    });
  });

  it('notifies subscribers on change and stops after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = runningTimer.subscribe(listener);

    runningTimer.start(1_000, 'Tarea');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(runningTimer.getSnapshot()).toMatchObject({ isRunning: true, taskName: 'Tarea' });

    runningTimer.stop();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    runningTimer.start(2_000, 'Otra');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('ignores no-op updates so useSyncExternalStore sees a stable reference', () => {
    runningTimer.start(1_000, 'Tarea');
    const first = runningTimer.getSnapshot();

    runningTimer.start(1_000, 'Tarea');
    expect(runningTimer.getSnapshot()).toBe(first);
  });

  it('retime preserves the task name', () => {
    runningTimer.start(1_000, 'Tarea');
    runningTimer.retime(2_000);
    expect(runningTimer.getSnapshot()).toEqual({
      isRunning: true,
      startTimeMs: 2_000,
      taskName: 'Tarea',
    });
  });

  it('retime is a no-op while stopped', () => {
    runningTimer.retime(5_000);
    expect(runningTimer.getSnapshot().isRunning).toBe(false);
  });

  it('stop is idempotent', () => {
    const listener = vi.fn();
    runningTimer.start(1_000, 'Tarea');
    runningTimer.subscribe(listener);

    runningTimer.stop();
    runningTimer.stop();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('secondsSince', () => {
  it('never returns a negative value', () => {
    expect(secondsSince(Date.now() + 5_000)).toBe(0);
  });

  it('floors to whole seconds', () => {
    expect(secondsSince(Date.now() - 2_500)).toBe(2);
  });
});
