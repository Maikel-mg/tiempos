import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useBulkReassign } from '../useBulkReassign';
import { toast } from 'sonner';
import type { Proceso, TimeEntry } from '../../types';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

const DESTINO: Proceso = { proceso: 555, nombre: 'Tarea destino' };

function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'e1',
    taskId: 100,
    taskName: 'Tarea vieja',
    proceso: { proceso: 100, nombre: 'Tarea vieja' },
    date: '2026-06-10',
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600,
    createdAt: '2026-06-10T09:00:00Z',
    updatedAt: '2026-06-10T09:00:00Z',
    synced: false,
    ...overrides,
  };
}

function setup(entries: TimeEntry[], selected: string[]) {
  const updateEntry = vi.fn(async (id: string, data: Partial<TimeEntry>) => ({ ...entries[0], ...data, id }));
  const setSelectedIds = vi.fn();

  const utils = renderHook(() =>
    useBulkReassign({
      entries,
      selectedIds: new Set(selected),
      setSelectedIds,
      updateEntry,
    })
  );

  return { ...utils, updateEntry, setSelectedIds };
}

describe('useBulkReassign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cuenta sólo los seleccionados y separa los ya sincronizados', () => {
    const { result } = setup(
      [makeEntry({ id: 'e1' }), makeEntry({ id: 'e2', synced: true }), makeEntry({ id: 'e3' })],
      ['e1', 'e2']
    );

    expect(result.current.reassignableCount).toBe(1);
    expect(result.current.skippedSyncedCount).toBe(1);
  });

  it('cambia tarea, nombre y proceso de los no sincronizados y limpia la selección', async () => {
    const { result, updateEntry, setSelectedIds } = setup(
      [makeEntry({ id: 'e1' }), makeEntry({ id: 'e2' })],
      ['e1', 'e2']
    );

    await act(async () => {
      await result.current.handleReassign(DESTINO);
    });

    expect(updateEntry).toHaveBeenCalledTimes(2);
    expect(updateEntry).toHaveBeenCalledWith('e1', {
      taskId: 555,
      taskName: 'Tarea destino',
      proceso: DESTINO,
    });
    expect(setSelectedIds).toHaveBeenCalledWith(new Set());
    expect(result.current.reassignOpen).toBe(false);
    expect(toast.success).toHaveBeenCalledWith('2 registros cambiados a Tarea destino');
  });

  it('no toca los sincronizados y lo dice en el aviso', async () => {
    const { result, updateEntry } = setup(
      [makeEntry({ id: 'e1' }), makeEntry({ id: 'e2', synced: true })],
      ['e1', 'e2']
    );

    await act(async () => {
      await result.current.handleReassign(DESTINO);
    });

    expect(updateEntry).toHaveBeenCalledTimes(1);
    expect(updateEntry).toHaveBeenCalledWith('e1', expect.objectContaining({ taskId: 555 }));
    expect(toast.success).toHaveBeenCalledWith(
      '1 registro cambiado a Tarea destino · 1 sincronizado(s) sin tocar'
    );
  });

  it('sin selección no hace nada', async () => {
    const { result, updateEntry, setSelectedIds } = setup([makeEntry()], []);

    await act(async () => {
      await result.current.handleReassign(DESTINO);
    });

    expect(updateEntry).not.toHaveBeenCalled();
    expect(setSelectedIds).not.toHaveBeenCalled();
  });
});
