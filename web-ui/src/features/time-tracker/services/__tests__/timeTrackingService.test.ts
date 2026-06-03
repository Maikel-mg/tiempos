import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TimeTrackingService } from '../timeTrackingService';
import type { StorageStrategy } from '@/lib/storage/StorageStrategy';
import type { TimerState } from '../types';

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
