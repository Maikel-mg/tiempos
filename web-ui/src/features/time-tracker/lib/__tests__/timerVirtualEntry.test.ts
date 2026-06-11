import { describe, it, expect } from 'vitest';
import { createVirtualTimerEntry } from '../timerVirtualEntry';
import type { TimerState } from '../../types';

function makeTimerState(overrides: Partial<TimerState> = {}): TimerState {
  return {
    isRunning: true,
    taskId: 1,
    taskName: 'Diseño API',
    startTime: '2026-06-11T10:30:00.000Z',
    elapsed: 2557, // 42min 37s
    description: 'Revisión de endpoints',
    ...overrides,
  };
}

describe('createVirtualTimerEntry', () => {
  // Use local dates to avoid timezone issues
  const now = new Date(2026, 5, 11, 11, 12, 37); // Jun 11 11:12 local

  it('returns task name from timer state', () => {
    const timer = makeTimerState({ startTime: new Date(2026, 5, 11, 10, 30).toISOString() });
    const entry = createVirtualTimerEntry(timer, now);
    expect(entry.taskName).toBe('Diseño API');
  });

  it('returns today date in sv-SE format', () => {
    const timer = makeTimerState({ startTime: new Date(2026, 5, 11, 10, 30).toISOString() });
    const entry = createVirtualTimerEntry(timer, now);
    expect(entry.date).toBe('2026-06-11');
  });

  it('returns formatted start time from timer state', () => {
    const timer = makeTimerState({ startTime: new Date(2026, 5, 11, 10, 30).toISOString() });
    const entry = createVirtualTimerEntry(timer, now);
    expect(entry.startTime).toBe('10:30');
  });

  it('returns formatted end time from current time', () => {
    const timer = makeTimerState({ startTime: new Date(2026, 5, 11, 10, 30).toISOString() });
    const entry = createVirtualTimerEntry(timer, now);
    expect(entry.endTime).toBe('11:12');
  });

  it('returns elapsed as duration', () => {
    const timer = makeTimerState({ elapsed: 2557, startTime: new Date(2026, 5, 11, 10, 30).toISOString() });
    const entry = createVirtualTimerEntry(timer, now);
    expect(entry.duration).toBe(2557);
  });

  it('returns description from timer state', () => {
    const timer = makeTimerState({ description: 'Revisión de endpoints', startTime: new Date(2026, 5, 11, 10, 30).toISOString() });
    const entry = createVirtualTimerEntry(timer, now);
    expect(entry.description).toBe('Revisión de endpoints');
  });

  it('returns undefined description when timer has none', () => {
    const timer = makeTimerState({ description: undefined, startTime: new Date(2026, 5, 11, 10, 30).toISOString() });
    const entry = createVirtualTimerEntry(timer, now);
    expect(entry.description).toBeUndefined();
  });

  it('returns taskId from timer state', () => {
    const timer = makeTimerState({ taskId: 42, startTime: new Date(2026, 5, 11, 10, 30).toISOString() });
    const entry = createVirtualTimerEntry(timer, now);
    expect(entry.taskId).toBe(42);
  });
});
