import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { CommandActionsProvider, type CommandAction } from '@/components/CommandActionsContext';
import {
  useTimeTrackerCommandActions,
  type UseTimeTrackerCommandActionsParams,
} from '../useTimeTrackerCommandActions';
import type { TimeEntry } from '../../types';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

function makeEntry(id: string): TimeEntry {
  return {
    id,
    taskId: 100,
    taskName: `Task ${id}`,
    proceso: { proceso: 100, nombre: 'Desarrollo' },
    date: '2026-06-10',
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600,
    description: `Description ${id}`,
    createdAt: '2026-06-10T09:00:00Z',
    updatedAt: '2026-06-10T09:00:00Z',
    synced: false,
  };
}

function setup(overrides: Partial<UseTimeTrackerCommandActionsParams> = {}) {
  const activeItem = makeEntry('1');
  const pendingEntries = [makeEntry('1'), makeEntry('2')];
  const params: UseTimeTrackerCommandActionsParams = {
    pendingEntries,
    handlePlayEntry: vi.fn(),
    timer: { isRunning: false, stop: vi.fn().mockResolvedValue(null) },
    createEntry: vi.fn().mockResolvedValue(makeEntry('new')),
    activeTab: 'table',
    setActiveTab: vi.fn(),
    activeItem,
    handleEditEntry: vi.fn(),
    handleDeleteEntry: vi.fn(),
    handleDuplicateEntry: vi.fn(),
    handleSyncEntry: vi.fn(),
    handleSplitEntry: vi.fn(),
    handleSplitTimer: vi.fn(),
    liveTimerEntry: null,
    timerSplitDisabledReason: undefined,
    openCreate: vi.fn(),
    setSyncPanelOpen: vi.fn(),
    pendingDescription: { current: undefined },
    ...overrides,
  };

  const { result } = renderHook(() => useTimeTrackerCommandActions(params), {
    wrapper: CommandActionsProvider,
  });

  return { result, params, activeItem, pendingEntries };
}

function find(actions: CommandAction[], id: string): CommandAction {
  const action = actions.find((a) => a.id === id);
  if (!action) throw new Error(`Missing command action: ${id}`);
  return action;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useTimeTrackerCommandActions', () => {
  it('expone las acciones de fila y de la barra', () => {
    const { result } = setup();
    const ids = result.current.map((a) => a.id);

    expect(ids).toEqual(
      expect.arrayContaining([
        'row-edit',
        'row-delete',
        'row-duplicate',
        'row-split',
        'split-running-timer',
        'row-play',
        'row-sync',
        'start-timer',
        'stop-timer',
        'sync-entries',
        'manual-entry',
        'switch-table',
        'switch-grouped',
      ]),
    );
  });

  it('row-edit edita el Registro activo', () => {
    const { result, params, activeItem } = setup();

    act(() => find(result.current, 'row-edit').action());

    expect(params.handleEditEntry).toHaveBeenCalledWith(activeItem);
  });

  it('las acciones de fila solo están disponibles con fila activa', () => {
    const { result } = setup({ activeItem: null });

    expect(find(result.current, 'row-edit').when?.()).toBe(false);
    expect(find(result.current, 'row-duplicate').when?.()).toBe(false);
    expect(find(result.current, 'row-play').when?.()).toBe(false);
  });

  it('manual-entry abre el editor vacío', () => {
    const { result, params } = setup();

    act(() => find(result.current, 'manual-entry').action());

    expect(params.openCreate).toHaveBeenCalledTimes(1);
  });

  it('switch-table y switch-grouped cambian la vista solo cuando procede', () => {
    const { result, params } = setup({ activeTab: 'table' });

    expect(find(result.current, 'switch-table').when?.()).toBe(false);
    expect(find(result.current, 'switch-grouped').when?.()).toBe(true);

    act(() => find(result.current, 'switch-grouped').action());

    expect(params.setActiveTab).toHaveBeenCalledWith('grouped');
  });

  it('sync-entries abre el panel de sincronización', () => {
    const { result, params } = setup();

    act(() => find(result.current, 'sync-entries').action());

    expect(params.setSyncPanelOpen).toHaveBeenCalledWith(true);
  });

  it('start-timer arranca el primer Registro pendiente', () => {
    const { result, params, pendingEntries } = setup();

    act(() => find(result.current, 'start-timer').action());

    expect(params.handlePlayEntry).toHaveBeenCalledWith(pendingEntries[0]);
  });

  it('start-timer avisa si no hay pendientes', () => {
    const { result } = setup({ pendingEntries: [] });

    act(() => find(result.current, 'start-timer').action());

    expect(toast.info).toHaveBeenCalledWith('No hay entradas para iniciar');
  });

  it('stop-timer detiene el timer, persiste la entrada y avisa', async () => {
    const stop = vi.fn().mockResolvedValue({
      start: new Date(2026, 5, 10, 9, 0),
      end: new Date(2026, 5, 10, 10, 0),
      taskId: 100,
      taskName: 'Task 1',
    });
    const createEntry = vi.fn().mockResolvedValue(makeEntry('new'));
    const { result } = setup({
      timer: { isRunning: true, stop },
      createEntry,
      pendingDescription: { current: 'Nota' },
    });

    await act(async () => {
      find(result.current, 'stop-timer').action();
    });

    expect(stop).toHaveBeenCalledWith({ persist: true });
    expect(createEntry).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: 100, taskName: 'Task 1', description: 'Nota' }),
    );
    expect(toast.success).toHaveBeenCalledWith('Timer detenido y guardado');
  });

  it('row-split divide el Registro activo cuando es divisible', () => {
    const { result, params, activeItem } = setup();

    expect(find(result.current, 'row-split').when?.()).toBe(true);

    act(() => find(result.current, 'row-split').action());

    expect(params.handleSplitEntry).toHaveBeenCalledWith(activeItem);
  });
});
