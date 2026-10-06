import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { RefObject } from 'react';
import { useEntryTableNavigation } from '../useEntryTableNavigation';
import type { TimeTrackerBarHandle } from '../../components/TimeTrackerBar';
import type { TimeEntry } from '../../types';

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

interface SetupOptions {
  items?: TimeEntry[];
  activeTab?: string;
  editingEntry?: TimeEntry | null;
  trackerBarRef?: RefObject<TimeTrackerBarHandle>;
}

function setup({
  items = [makeEntry('1'), makeEntry('2'), makeEntry('3')],
  activeTab = 'table',
  editingEntry = null,
  trackerBarRef = { current: null },
}: SetupOptions = {}) {
  const tableRef: RefObject<HTMLTableElement> = { current: null };
  const onEdit = vi.fn();
  const onDuplicate = vi.fn();
  const onPlay = vi.fn();
  const onSync = vi.fn();
  const onDelete = vi.fn();

  const utils = renderHook(() =>
    useEntryTableNavigation({
      tableRef,
      items,
      activeTab,
      editingEntry,
      trackerBarRef,
      onEdit,
      onDuplicate,
      onPlay,
      onSync,
      onDelete,
    }),
  );

  return { ...utils, items, onEdit, onDuplicate, onPlay, onSync, onDelete };
}

function press(key: string, modifiers: KeyboardEventInit = {}) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, ...modifiers }));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  document.body.focus();
  document.querySelectorAll('[role="dialog"][data-state="open"]').forEach((el) => el.remove());
  document.querySelectorAll('[cmdk-dialog]').forEach((el) => el.remove());
});

describe('useEntryTableNavigation', () => {
  it('auto-focaliza la primera fila al montar en la vista de tabla', () => {
    const { result, items } = setup();

    expect(result.current.activeItem).toEqual(items[0]);
    expect(result.current.getRowProps(0)['data-state']).toBe('active');
  });

  it('no auto-focaliza en la vista agrupada', () => {
    const { result } = setup({ activeTab: 'grouped' });

    expect(result.current.activeItem).toBeNull();
  });

  it('focusFirst activa la primera fila', () => {
    const { result, items } = setup({ activeTab: 'grouped' });

    act(() => {
      result.current.focusFirst();
    });

    expect(result.current.activeItem).toEqual(items[0]);
  });

  it('sin Registros no hay fila activa', () => {
    const { result } = setup({ items: [] });

    expect(result.current.activeItem).toBeNull();
  });

  it('getRowProps marca solo la fila activa', () => {
    const { result } = setup();

    expect(result.current.getRowProps(0).tabIndex).toBe(0);
    expect(result.current.getRowProps(1)['data-state']).toBeUndefined();
    expect(result.current.getRowProps(1).tabIndex).toBe(-1);
  });

  it('los atajos de fila despachan al Registro activo', () => {
    const { onEdit, onDuplicate, onPlay, onSync, items } = setup();

    press('e');
    press('d');
    press('r');
    press('s');

    expect(onEdit).toHaveBeenCalledWith(items[0]);
    expect(onDuplicate).toHaveBeenCalledWith(items[0]);
    expect(onPlay).toHaveBeenCalledWith(items[0]);
    expect(onSync).toHaveBeenCalledWith(items[0]);
  });

  it('Delete pide confirmación y borra el Registro activo si se acepta', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { onDelete } = setup();

    press('Delete');

    expect(window.confirm).toHaveBeenCalledWith('¿Eliminar "Task 1"?');
    expect(onDelete).toHaveBeenCalledWith('1');
  });

  it('Delete no borra si se cancela la confirmación', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { onDelete } = setup();

    press('Delete');

    expect(onDelete).not.toHaveBeenCalled();
  });

  it('desactiva los atajos de fila mientras el editor está abierto', () => {
    const { onDuplicate } = setup({ editingEntry: makeEntry('9') });

    press('d');

    expect(onDuplicate).not.toHaveBeenCalled();
  });

  it('desactiva los atajos de fila mientras se edita la hora de inicio', () => {
    const trackerBarRef: RefObject<TimeTrackerBarHandle> = {
      current: { isEditingStartTime: true },
    };
    const { onDuplicate } = setup({ trackerBarRef });

    press('d');

    expect(onDuplicate).not.toHaveBeenCalled();
  });
});
