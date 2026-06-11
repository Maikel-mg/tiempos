import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TimeTrackingService } from '../timeTrackingService';
import type { StorageStrategy } from '@/lib/storage/StorageStrategy';
import type { TimeEntry, TimerState } from '../types';

function createMockStorage(): StorageStrategy {
  return {
    saveEntry: vi.fn().mockResolvedValue(undefined),
    getEntry: vi.fn().mockResolvedValue(null),
    getAllEntries: vi.fn().mockResolvedValue([]),
    getEntriesByDateRange: vi.fn().mockResolvedValue([]),
    updateEntry: vi.fn().mockResolvedValue(undefined),
    deleteEntry: vi.fn().mockResolvedValue(undefined),
    markAsSynced: vi.fn().mockResolvedValue(undefined),
    saveTimerState: vi.fn().mockResolvedValue(undefined),
    getTimerState: vi.fn(),
    clearTimerState: vi.fn().mockResolvedValue(undefined),
  };
}

describe('TimeTrackingService.stopTimer', () => {
  let storage: StorageStrategy;
  let service: TimeTrackingService;

  beforeEach(() => {
    storage = createMockStorage();
    service = new TimeTrackingService(storage);
  });

  it('returns raw start/end without creating entry when persist is false', async () => {
    const timerState: TimerState = {
      isRunning: true,
      taskId: 42,
      taskName: 'Test Task',
      startTime: new Date(Date.now() - 60000).toISOString(),
      elapsed: 60,
    };
    vi.mocked(storage.getTimerState).mockResolvedValue(timerState);

    const result = await service.stopTimer({ persist: false });

    expect(result).not.toBeNull();
    expect(result!.taskId).toBe(42);
    expect(result!.taskName).toBe('Test Task');
    expect(result!.start).toBeInstanceOf(Date);
    expect(result!.end).toBeInstanceOf(Date);
    expect(storage.saveEntry).not.toHaveBeenCalled();
    expect(storage.clearTimerState).toHaveBeenCalled();
  });

  it('returns null when no timer is running', async () => {
    vi.mocked(storage.getTimerState).mockResolvedValue(null);

    const result = await service.stopTimer({ persist: false });

    expect(result).toBeNull();
  });
});

describe('TimeTrackingService.createEntry', () => {
  let storage: StorageStrategy;
  let service: TimeTrackingService;

  beforeEach(() => {
    storage = createMockStorage();
    service = new TimeTrackingService(storage);
  });

  it('creates entry with recoverable field when provided', async () => {
    const entry = await service.createEntry({
      taskId: 1,
      taskName: 'Test',
      date: '2025-06-11',
      startTime: '09:00',
      endTime: '10:00',
      recoverable: true,
    });

    expect(entry.recoverable).toBe(true);
    expect(storage.saveEntry).toHaveBeenCalledWith(
      expect.objectContaining({ recoverable: true })
    );
  });

  it('creates entry without recoverable field when not provided', async () => {
    const entry = await service.createEntry({
      taskId: 1,
      taskName: 'Test',
      date: '2025-06-11',
      startTime: '09:00',
      endTime: '10:00',
    });

    expect(entry.recoverable).toBeUndefined();
  });
});

describe('TimeTrackingService.updateEntry', () => {
  let storage: StorageStrategy;
  let service: TimeTrackingService;

  beforeEach(() => {
    storage = createMockStorage();
    service = new TimeTrackingService(storage);
  });

  it('updates recoverable field on existing entry', async () => {
    const existing: TimeEntry = {
      id: '1',
      taskId: 1,
      taskName: 'Test',
      date: '2025-06-11',
      startTime: '09:00',
      endTime: '10:00',
      duration: 3600,
      createdAt: '2025-06-11T09:00:00Z',
      updatedAt: '2025-06-11T09:00:00Z',
      synced: false,
    };
    vi.mocked(storage.getEntry).mockResolvedValue(existing);

    const updated = await service.updateEntry('1', { recoverable: true });

    expect(updated).not.toBeNull();
    expect(updated!.recoverable).toBe(true);
    expect(storage.updateEntry).toHaveBeenCalledWith(
      expect.objectContaining({ recoverable: true })
    );
  });
});
