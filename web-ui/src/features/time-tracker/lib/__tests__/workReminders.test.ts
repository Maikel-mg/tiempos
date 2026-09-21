import { describe, it, expect } from 'vitest';
import {
  advanceFired,
  buildReminderMessage,
  evaluateReminders,
  type ReminderContext,
  type ReminderSettings,
} from '../workReminders';

/** Timestamp local del 2026-09-21 a la hora indicada (lunes laborable). */
function at(hours: number, minutes: number, seconds = 0): number {
  return new Date(2026, 8, 21, hours, minutes, seconds).getTime();
}

const WORKDAY_START = 9 * 60; // 09:00

const SETTINGS: ReminderSettings = {
  runningAlertEnabled: true,
  runningAlertMinutes: 15,
  noTimerAlertEnabled: true,
  noTimerAlertMinutes: 30,
};

function context(overrides: Partial<ReminderContext> = {}): ReminderContext {
  return {
    now: at(9, 0),
    isRunning: false,
    taskName: '',
    elapsedSeconds: 0,
    workdayStartMinutes: null,
    todayWorkedSeconds: 0,
    todayTargetSeconds: 8.25 * 3600,
    ...overrides,
  };
}

describe('evaluateReminders · timer corriendo', () => {
  it('stays quiet below the threshold', () => {
    const result = evaluateReminders(
      context({ isRunning: true, taskName: 'Desarrollo', elapsedSeconds: 15 * 60 - 1 }),
      SETTINGS,
    );

    expect(result.runningStep).toBe(0);
  });

  it('advances to step 1 exactly at the threshold', () => {
    const result = evaluateReminders(
      context({ isRunning: true, taskName: 'Desarrollo', elapsedSeconds: 15 * 60 }),
      SETTINGS,
    );

    expect(result.runningStep).toBe(1);
  });

  it('advances one step per threshold reached', () => {
    const result = evaluateReminders(
      context({ isRunning: true, taskName: 'Desarrollo', elapsedSeconds: 37 * 60 + 30 }),
      SETTINGS,
    );

    expect(result.runningStep).toBe(2);
  });

  it('stays quiet when the timer is not running', () => {
    const result = evaluateReminders(
      context({ isRunning: false, elapsedSeconds: 90 * 60 }),
      SETTINGS,
    );

    expect(result.runningStep).toBe(0);
  });

  it('stays quiet when disabled', () => {
    const result = evaluateReminders(
      context({ isRunning: true, taskName: 'Desarrollo', elapsedSeconds: 90 * 60 }),
      { ...SETTINGS, runningAlertEnabled: false },
    );

    expect(result.runningStep).toBe(0);
  });

  it('ignores a non-positive threshold instead of dividing by zero', () => {
    const result = evaluateReminders(
      context({ isRunning: true, taskName: 'Desarrollo', elapsedSeconds: 90 * 60 }),
      { ...SETTINGS, runningAlertMinutes: 0 },
    );

    expect(result.runningStep).toBe(0);
  });
});

describe('evaluateReminders · sin timer', () => {
  it('stays quiet before the workday starts', () => {
    const result = evaluateReminders(
      context({ now: at(8, 45), workdayStartMinutes: WORKDAY_START }),
      SETTINGS,
    );

    expect(result.noTimerStep).toBe(0);
  });

  it('stays quiet one second before the threshold', () => {
    const result = evaluateReminders(
      context({ now: at(9, 29, 59), workdayStartMinutes: WORKDAY_START }),
      SETTINGS,
    );

    expect(result.noTimerStep).toBe(0);
  });

  it('advances to step 1 exactly at the threshold', () => {
    const result = evaluateReminders(
      context({ now: at(9, 30), workdayStartMinutes: WORKDAY_START }),
      SETTINGS,
    );

    expect(result.noTimerStep).toBe(1);
  });

  it('advances one step per threshold reached', () => {
    const result = evaluateReminders(
      context({ now: at(10, 0), workdayStartMinutes: WORKDAY_START }),
      SETTINGS,
    );

    expect(result.noTimerStep).toBe(2);
  });

  it('stays quiet when a timer is running', () => {
    const result = evaluateReminders(
      context({
        now: at(11, 0),
        isRunning: true,
        taskName: 'Desarrollo',
        workdayStartMinutes: WORKDAY_START,
      }),
      SETTINGS,
    );

    expect(result.noTimerStep).toBe(0);
  });

  it('stays quiet on a non-workday', () => {
    const result = evaluateReminders(
      context({ now: at(11, 0), workdayStartMinutes: null }),
      SETTINGS,
    );

    expect(result.noTimerStep).toBe(0);
  });

  it('stays quiet once the day target is met', () => {
    const result = evaluateReminders(
      context({
        now: at(17, 0),
        workdayStartMinutes: WORKDAY_START,
        todayWorkedSeconds: 8.25 * 3600,
        todayTargetSeconds: 8.25 * 3600,
      }),
      SETTINGS,
    );

    expect(result.noTimerStep).toBe(0);
  });

  it('still nudges after stopping early, before the target is met', () => {
    const result = evaluateReminders(
      context({
        now: at(14, 30),
        workdayStartMinutes: WORKDAY_START,
        todayWorkedSeconds: 5 * 3600,
        todayTargetSeconds: 8.25 * 3600,
      }),
      SETTINGS,
    );

    expect(result.noTimerStep).toBe(11);
  });

  it('stays quiet when disabled', () => {
    const result = evaluateReminders(
      context({ now: at(11, 0), workdayStartMinutes: WORKDAY_START }),
      { ...SETTINGS, noTimerAlertEnabled: false },
    );

    expect(result.noTimerStep).toBe(0);
  });

  it('reports both rules independently', () => {
    const result = evaluateReminders(
      context({
        now: at(10, 0),
        isRunning: true,
        taskName: 'Desarrollo',
        elapsedSeconds: 30 * 60,
        workdayStartMinutes: WORKDAY_START,
      }),
      SETTINGS,
    );

    expect(result).toEqual({ runningStep: 2, noTimerStep: 0 });
  });
});

describe('advanceFired', () => {
  it('fires the first time a step is reached', () => {
    expect(advanceFired(0, 1)).toEqual({ fire: true, fired: 1 });
  });

  it('does not fire twice for the same step', () => {
    expect(advanceFired(1, 1)).toEqual({ fire: false, fired: 1 });
  });

  it('fires again when the step grows', () => {
    expect(advanceFired(1, 2)).toEqual({ fire: true, fired: 2 });
  });

  it('clears the counter while the rule does not apply', () => {
    expect(advanceFired(3, 0)).toEqual({ fire: false, fired: 0 });
  });

  it('lets a new timer session fire after a stop cleared the step', () => {
    const stopped = advanceFired(3, 0);
    expect(stopped.fired).toBe(0);

    // El timer nuevo vuelve a llegar al umbral: tiene que avisar otra vez.
    expect(advanceFired(stopped.fired, 1)).toEqual({ fire: true, fired: 1 });
  });

  it('lets the next day fire after midnight cleared the step', () => {
    const midnight = advanceFired(9, 0);
    expect(midnight.fired).toBe(0);

    expect(advanceFired(midnight.fired, 1).fire).toBe(true);
  });
});

describe('buildReminderMessage', () => {
  it('describes a long running timer', () => {
    const message = buildReminderMessage(
      'running',
      context({ isRunning: true, taskName: 'Desarrollo', elapsedSeconds: 75 * 60 }),
    );

    expect(message).toEqual({
      kind: 'running',
      title: '¿Sigue en curso el timer?',
      body: '«Desarrollo» lleva 1h 15m corriendo.',
      tag: 'timer-running',
    });
  });

  it('describes the missing timer with the workday start', () => {
    const message = buildReminderMessage(
      'no-timer',
      context({ workdayStartMinutes: WORKDAY_START }),
    );

    expect(message).toEqual({
      kind: 'no-timer',
      title: 'No arrancaste el timer',
      body: 'No hay ningún timer corriendo desde las 09:00.',
      tag: 'timer-not-started',
    });
  });

  it('omits the start time when there is none', () => {
    const message = buildReminderMessage('no-timer', context({ workdayStartMinutes: null }));

    expect(message.body).toBe('No hay ningún timer corriendo.');
  });
});
