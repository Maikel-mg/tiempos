import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { indexedDBStorage } from '@/lib/storage/IndexedDBStorage';
import { runningTimer } from '../runningTimer';
import {
  cancelTimer,
  hydrateFromStorage,
  startLastUsedTask,
  startTimer,
  stopTimer,
  toggleTimer,
  updateTimerDescription,
  updateTimerStartTime,
} from '../timerActions';

async function seedEntry(createdAt: string, taskId: number, taskName: string) {
  await indexedDBStorage.saveEntry({
    id: `entry-${taskId}-${createdAt}`,
    taskId,
    taskName,
    proceso: { proceso: taskId, nombre: taskName },
    date: '2026-09-18',
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600,
    createdAt,
    updatedAt: createdAt,
    synced: false,
  });
}

describe('timerActions', () => {
  beforeEach(async () => {
    runningTimer.stop();
    await indexedDBStorage.clearTimerState();
    for (const entry of await indexedDBStorage.getAllEntries()) {
      await indexedDBStorage.deleteEntry(entry.id);
    }
  });

  it('startTimer publishes the state and persists it', async () => {
    await startTimer(101, 'Tarea', 'revisando');

    expect(runningTimer.getSnapshot()).toMatchObject({
      isRunning: true,
      taskId: 101,
      taskName: 'Tarea',
      description: 'revisando',
    });
    expect((await indexedDBStorage.getTimerState())?.taskId).toBe(101);
  });

  it('stopTimer clears the timer and creates the entry', async () => {
    await startTimer(101, 'Tarea');

    const result = await stopTimer();

    expect(runningTimer.getSnapshot().isRunning).toBe(false);
    expect(await indexedDBStorage.getTimerState()).toBeNull();
    expect(result).not.toBeNull();
    expect(await indexedDBStorage.getAllEntries()).toHaveLength(1);
  });

  it('cancelTimer clears the timer without creating an entry', async () => {
    await startTimer(101, 'Tarea');

    await cancelTimer();

    expect(runningTimer.getSnapshot().isRunning).toBe(false);
    expect(await indexedDBStorage.getAllEntries()).toHaveLength(0);
  });

  it('hydrateFromStorage publishes a timer left running in storage', async () => {
    const startTime = new Date(Date.now() - 60_000).toISOString();
    await indexedDBStorage.saveTimerState({
      isRunning: true,
      taskId: 303,
      taskName: 'Hidratada',
      startTime,
      elapsed: 0,
    });

    const state = await hydrateFromStorage();

    expect(state?.taskId).toBe(303);
    expect(runningTimer.getSnapshot()).toMatchObject({
      isRunning: true,
      taskId: 303,
      taskName: 'Hidratada',
      startTime,
    });
  });

  it('updateTimerStartTime re-anchors the store', async () => {
    await startTimer(101, 'Tarea');
    const newStart = new Date(Date.now() - 3_600_000).toISOString();

    await updateTimerStartTime(newStart);

    expect(runningTimer.getSnapshot().startTimeMs).toBe(new Date(newStart).getTime());
  });

  it('updateTimerDescription updates the store', async () => {
    await startTimer(101, 'Tarea');

    await updateTimerDescription('nuevo comentario');

    expect(runningTimer.getSnapshot().description).toBe('nuevo comentario');
  });

  describe('startLastUsedTask', () => {
    it('continues the most recently created entry', async () => {
      await seedEntry('2026-09-18T08:00:00.000Z', 1, 'Vieja');
      await seedEntry('2026-09-18T12:00:00.000Z', 2, 'Nueva');

      const result = await startLastUsedTask();

      expect(result).toEqual({ action: 'started', taskName: 'Nueva' });
      expect(runningTimer.getSnapshot().taskId).toBe(2);
    });

    it('reports no previous task when there are no entries', async () => {
      expect(await startLastUsedTask()).toEqual({ action: 'no-previous-task' });
      expect(runningTimer.getSnapshot().isRunning).toBe(false);
    });
  });

  describe('toggleTimer', () => {
    it('starts on the last used task when stopped', async () => {
      await seedEntry('2026-09-18T12:00:00.000Z', 2, 'Nueva');

      expect(await toggleTimer()).toEqual({ action: 'started', taskName: 'Nueva' });
      expect(runningTimer.getSnapshot().isRunning).toBe(true);
    });

    it('stops when running', async () => {
      await startTimer(101, 'Tarea');

      expect(await toggleTimer()).toEqual({ action: 'stopped', taskName: 'Tarea' });
      expect(runningTimer.getSnapshot().isRunning).toBe(false);
    });

    it('refuses to stop across midnight and leaves the timer running', async () => {
      const yesterday = new Date(Date.now() - 36 * 3_600_000).toISOString();
      runningTimer.start({
        isRunning: true,
        taskId: 9,
        taskName: 'Nocturna',
        startTime: yesterday,
        elapsed: 0,
      });

      expect(await toggleTimer()).toEqual({ action: 'blocked-midnight', taskName: 'Nocturna' });
      expect(runningTimer.getSnapshot().isRunning).toBe(true);
      expect(await indexedDBStorage.getAllEntries()).toHaveLength(0);
    });
  });
});
