import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runningTimer, secondsSince } from '../runningTimer';
import type { TimerState } from '../../types';

const START_ISO = new Date('2026-09-19T10:00:00.000Z').toISOString();
const START_MS = new Date(START_ISO).getTime();

function makeState(overrides: Partial<TimerState> = {}): TimerState {
  return {
    isRunning: true,
    taskId: 101,
    taskName: 'Tarea',
    startTime: START_ISO,
    elapsed: 0,
    ...overrides,
  };
}

describe('runningTimer', () => {
  beforeEach(() => {
    runningTimer.stop();
  });

  it('starts stopped', () => {
    expect(runningTimer.getSnapshot()).toEqual({
      isRunning: false,
      startTimeMs: 0,
      startTime: '',
      taskId: 0,
      taskName: '',
    });
  });

  it('publishes the full state on start and notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = runningTimer.subscribe(listener);

    runningTimer.start(makeState({ description: 'revisando' }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(runningTimer.getSnapshot()).toEqual({
      isRunning: true,
      startTimeMs: START_MS,
      startTime: START_ISO,
      taskId: 101,
      taskName: 'Tarea',
      description: 'revisando',
    });

    unsubscribe();
    runningTimer.stop();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('ignores no-op starts so useSyncExternalStore sees a stable reference', () => {
    runningTimer.start(makeState());
    const first = runningTimer.getSnapshot();

    runningTimer.start(makeState());
    expect(runningTimer.getSnapshot()).toBe(first);
  });

  it('emits when only the task changes', () => {
    const listener = vi.fn();
    runningTimer.start(makeState());
    runningTimer.subscribe(listener);

    runningTimer.start(makeState({ taskId: 202, taskName: 'Otra' }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(runningTimer.getSnapshot().taskId).toBe(202);
  });

  it('retime re-anchors the start and preserves the rest', () => {
    runningTimer.start(makeState({ description: 'revisando' }));
    const newIso = new Date('2026-09-19T09:30:00.000Z').toISOString();

    runningTimer.retime(newIso);

    expect(runningTimer.getSnapshot()).toMatchObject({
      startTime: newIso,
      startTimeMs: new Date(newIso).getTime(),
      taskId: 101,
      taskName: 'Tarea',
      description: 'revisando',
    });
  });

  it('retime is a no-op while stopped', () => {
    runningTimer.retime('2026-09-19T09:30:00.000Z');
    expect(runningTimer.getSnapshot().isRunning).toBe(false);
  });

  it('describe updates the running description', () => {
    runningTimer.start(makeState());
    runningTimer.describe('nuevo comentario');
    expect(runningTimer.getSnapshot().description).toBe('nuevo comentario');
  });

  it('describe is a no-op while stopped', () => {
    runningTimer.describe('nuevo comentario');
    expect(runningTimer.getSnapshot().description).toBeUndefined();
  });

  it('stop is idempotent', () => {
    const listener = vi.fn();
    runningTimer.start(makeState());
    runningTimer.subscribe(listener);

    runningTimer.stop();
    runningTimer.stop();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(runningTimer.getSnapshot().isRunning).toBe(false);
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
