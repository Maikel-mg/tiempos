import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTimeTrackingSession, useTimeTrackingFlows } from '../useTimeTrackingSession';
import { useTimeEntries } from '../useTimeEntries';
import { useTimer } from '../useTimer';
import type { TimeEntry } from '../../types';

vi.mock('../useTimeEntries');
vi.mock('../useTimer');

function entry(id: string, overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id,
    taskId: 1,
    taskName: 'Tarea',
    proceso: { proceso: 1, nombre: 'Tarea' },
    date: '2026-06-10',
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600,
    synced: false,
    createdAt: '2026-06-10T09:00:00.000Z',
    updatedAt: '2026-06-10T09:00:00.000Z',
    ...overrides,
  };
}

const createEntry = vi.fn();
const updateEntry = vi.fn();
const deleteEntry = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useTimeEntries).mockReturnValue({
    entries: [entry('a'), entry('b', { synced: true })],
    loading: false,
    createEntry,
    updateEntry,
    deleteEntry,
    splitEntry: vi.fn(),
    splitRunningTimer: vi.fn(),
    markSynced: vi.fn(),
  } as unknown as ReturnType<typeof useTimeEntries>);
  vi.mocked(useTimer).mockReturnValue({
    isRunning: false,
    elapsed: 0,
    timerState: null,
    start: vi.fn(),
    stop: vi.fn(),
    updateStartTime: vi.fn(),
    updateDescription: vi.fn(),
    cancel: vi.fn(),
  } as unknown as ReturnType<typeof useTimer>);
});

describe('useTimeTrackingSession', () => {
  it('expone los Registros de tiempo, el editor y el Timer activo', () => {
    const { result } = renderHook(() => useTimeTrackingSession());

    expect(result.current.entries).toHaveLength(2);
    expect(result.current.timer.isRunning).toBe(false);
    expect(typeof result.current.editor.openEdit).toBe('function');
    expect(typeof result.current.editor.duplicate).toBe('function');
    expect(result.current.selection.selectedIds.size).toBe(0);
  });

  it('el editor borra y limpia la selección', async () => {
    const { result } = renderHook(() => useTimeTrackingSession());
    act(() => {
      result.current.selection.setSelectedIds(new Set(['a']));
    });

    await act(async () => {
      await result.current.editor.remove('a');
    });

    expect(deleteEntry).toHaveBeenCalledWith('a');
    expect(result.current.selection.selectedIds.has('a')).toBe(false);
  });
});

describe('useTimeTrackingFlows', () => {
  it('sincroniza en bloque seleccionando esos Registros de tiempo y abriendo el panel', () => {
    const { result } = renderHook(() => {
      const session = useTimeTrackingSession();
      const flows = useTimeTrackingFlows(session, { liveTimerEntry: null });
      return { session, flows };
    });

    act(() => {
      result.current.flows.syncMany(['a']);
    });

    expect([...result.current.session.selection.selectedIds]).toEqual(['a']);
    expect(result.current.flows.sync.syncPanelOpen).toBe(true);
    // Solo lo pendiente y con Tarea en la base de datos entra en el panel.
    expect(result.current.flows.sync.entriesToSync.map((item) => item.id)).toEqual(['a']);
  });
});
