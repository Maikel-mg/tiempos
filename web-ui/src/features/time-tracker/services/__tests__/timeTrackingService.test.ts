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
    saveEntries: vi.fn().mockResolvedValue(undefined),
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

describe('TimeTrackingService.splitEntry', () => {
  let storage: StorageStrategy;
  let service: TimeTrackingService;

  const entry: TimeEntry = {
    id: 'entry-1',
    taskId: 100,
    taskName: 'Desarrollo',
    proceso: { proceso: 100, nombre: 'Desarrollo' },
    date: '2025-06-11',
    startTime: '09:00',
    endTime: '12:00',
    duration: 10800,
    description: 'Original',
    createdAt: '2025-06-11T09:00:00Z',
    updatedAt: '2025-06-11T09:00:00Z',
    synced: false,
  };

  beforeEach(() => {
    storage = createMockStorage();
    service = new TimeTrackingService(storage);
  });

  it('aplica la descripción indicada a cada mitad', async () => {
    vi.mocked(storage.getEntry).mockResolvedValue(entry);

    const outcome = await service.splitEntry('entry-1', '11:00', {
      first: 'Revisión de endpoints',
      second: 'Maquetación',
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.first.description).toBe('Revisión de endpoints');
    expect(outcome.second.description).toBe('Maquetación');
  });

  it('hereda la descripción original cuando no se indica otra', async () => {
    vi.mocked(storage.getEntry).mockResolvedValue(entry);

    const outcome = await service.splitEntry('entry-1', '11:00');

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.first.description).toBe('Original');
    expect(outcome.second.description).toBe('Original');
  });
});

describe('TimeTrackingService.splitRunningTimer', () => {
  let storage: StorageStrategy;
  let service: TimeTrackingService;

  const timerEntry: TimeEntry = {
    id: 'timer-activo',
    taskId: 1,
    taskName: 'Test',
    proceso: { proceso: 1, nombre: 'Test', proyectoId: 7 },
    date: '2025-06-11',
    startTime: '09:00',
    endTime: '11:00',
    duration: 7200,
    createdAt: '2025-06-11T09:00:00Z',
    updatedAt: '2025-06-11T09:00:00Z',
    synced: false,
  };

  beforeEach(() => {
    storage = createMockStorage();
    service = new TimeTrackingService(storage);
  });

  it('persiste sólo la primera mitad, con id propio, y devuelve el nuevo anclaje del timer', async () => {
    const outcome = await service.splitRunningTimer(timerEntry, '10:00');

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.first).toMatchObject({ startTime: '09:00', endTime: '10:00' });
    // El id del ancla no se puede reutilizar: es un Registro nuevo en el almacén.
    expect(outcome.first.id).not.toBe('timer-activo');
    expect(outcome.first.id).toBeTruthy();
    expect(storage.saveEntry).toHaveBeenCalledWith(outcome.first);
    expect(storage.saveEntries).not.toHaveBeenCalled();
    expect(new Date(outcome.timerStartTime).getHours()).toBe(10);
  });

  it('usa la descripción indicada en la primera mitad persistida', async () => {
    const outcome = await service.splitRunningTimer(timerEntry, '10:00', 'Foco hasta el corte');

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.first.description).toBe('Foco hasta el corte');
  });

  it('dos divisiones seguidas del mismo ancla no reutilizan el id', async () => {
    const first = await service.splitRunningTimer(timerEntry, '10:00');
    const second = await service.splitRunningTimer(timerEntry, '10:30');

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.first.id).not.toBe(second.first.id);
  });

  it('rechaza el corte fuera del intervalo sin persistir nada', async () => {
    const outcome = await service.splitRunningTimer(timerEntry, '11:00');

    expect(outcome.ok).toBe(false);
    expect(storage.saveEntry).not.toHaveBeenCalled();
  });
});
