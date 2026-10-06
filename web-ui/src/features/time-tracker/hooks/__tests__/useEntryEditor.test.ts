import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useEntryEditor } from '../useEntryEditor';
import { toast } from 'sonner';
import type { TimeEntry } from '../../types';
import type { TimeEntryFormData } from '../../components/TimeEntryEditorDialog';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'e1',
    taskId: 100,
    taskName: 'Task e1',
    proceso: { proceso: 100, nombre: 'Desarrollo' },
    date: '2026-06-10',
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600,
    description: 'Description e1',
    createdAt: '2026-06-10T09:00:00Z',
    updatedAt: '2026-06-10T09:00:00Z',
    synced: false,
    ...overrides,
  };
}

const formData: TimeEntryFormData = {
  taskId: 100,
  taskName: 'Task e1',
  date: '2026-06-10',
  startTime: '09:00',
  endTime: '10:00',
  description: 'Description e1',
  recoverable: false,
};

interface SetupOptions {
  entries?: TimeEntry[];
}

function setup({ entries = [makeEntry()] }: SetupOptions = {}) {
  const createEntry = vi.fn().mockResolvedValue(makeEntry());
  const updateEntry = vi.fn().mockResolvedValue(makeEntry());
  const deleteEntry = vi.fn().mockResolvedValue(undefined);
  const onEntryDeleted = vi.fn();

  const utils = renderHook(() =>
    useEntryEditor({ entries, createEntry, updateEntry, deleteEntry, onEntryDeleted })
  );

  return { ...utils, createEntry, updateEntry, deleteEntry, onEntryDeleted };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useEntryEditor', () => {
  it('arranca con el editor cerrado y sin Registro en edición', () => {
    const { result } = setup();

    expect(result.current.isEditorOpen).toBe(false);
    expect(result.current.editingEntry).toBeNull();
  });

  it('openEdit abre el editor con el Registro recibido', () => {
    const entry = makeEntry({ id: 'e9' });
    const { result } = setup({ entries: [entry] });

    act(() => {
      result.current.openEdit(entry);
    });

    expect(result.current.isEditorOpen).toBe(true);
    expect(result.current.editingEntry).toBe(entry);
  });

  it('openCreate abre el editor sin Registro en edición', () => {
    const { result } = setup();

    act(() => {
      result.current.openCreate();
    });

    expect(result.current.isEditorOpen).toBe(true);
    expect(result.current.editingEntry).toBeNull();
  });

  it('close cierra el editor y descarta el Registro en edición', () => {
    const entry = makeEntry();
    const { result } = setup({ entries: [entry] });

    act(() => {
      result.current.openEdit(entry);
    });
    act(() => {
      result.current.close();
    });

    expect(result.current.isEditorOpen).toBe(false);
    expect(result.current.editingEntry).toBeNull();
  });

  it('handleOpenChange abre con true y cierra limpiando el Registro con false', () => {
    const entry = makeEntry();
    const { result } = setup({ entries: [entry] });

    act(() => {
      result.current.openEdit(entry);
    });
    act(() => {
      result.current.handleOpenChange(false);
    });

    expect(result.current.isEditorOpen).toBe(false);
    expect(result.current.editingEntry).toBeNull();

    act(() => {
      result.current.handleOpenChange(true);
    });

    expect(result.current.isEditorOpen).toBe(true);
  });

  it('abrir y cerrar el editor no toca ningún Registro', () => {
    const entry = makeEntry();
    const { result, createEntry, updateEntry, deleteEntry } = setup({ entries: [entry] });

    act(() => {
      result.current.openEdit(entry);
    });
    act(() => {
      result.current.openCreate();
    });
    act(() => {
      result.current.close();
    });

    expect(createEntry).not.toHaveBeenCalled();
    expect(updateEntry).not.toHaveBeenCalled();
    expect(deleteEntry).not.toHaveBeenCalled();
  });

  it('submit crea un Registro cuando no hay edición y descarta el Registro en edición', async () => {
    const { result, createEntry, updateEntry } = setup();

    act(() => {
      result.current.openCreate();
    });
    await act(async () => {
      await result.current.submit(formData);
    });

    expect(createEntry).toHaveBeenCalledWith(formData);
    expect(updateEntry).not.toHaveBeenCalled();
    expect(result.current.editingEntry).toBeNull();
  });

  it('submit actualiza el Registro en edición y descarta el Registro en edición', async () => {
    const entry = makeEntry({ id: 'e7' });
    const { result, createEntry, updateEntry } = setup({ entries: [entry] });

    act(() => {
      result.current.openEdit(entry);
    });
    await act(async () => {
      await result.current.submit(formData);
    });

    expect(updateEntry).toHaveBeenCalledWith('e7', formData);
    expect(createEntry).not.toHaveBeenCalled();
    expect(result.current.editingEntry).toBeNull();
  });

  it('el cierre del diálogo tras submit cierra el editor', async () => {
    const { result } = setup();

    act(() => {
      result.current.openCreate();
    });
    await act(async () => {
      await result.current.submit(formData);
    });
    act(() => {
      result.current.handleOpenChange(false);
    });

    expect(result.current.isEditorOpen).toBe(false);
  });

  it('create crea un Registro sin alterar el estado del editor', async () => {
    const { result, createEntry } = setup();

    await act(async () => {
      await result.current.create(formData);
    });

    expect(createEntry).toHaveBeenCalledWith(formData);
    expect(result.current.isEditorOpen).toBe(false);
    expect(result.current.editingEntry).toBeNull();
  });

  it('duplicate crea una copia con los datos del Registro y avisa', async () => {
    const entry = makeEntry({ id: 'e3' });
    const { result, createEntry } = setup({ entries: [entry] });

    await act(async () => {
      await result.current.duplicate(entry);
    });

    expect(createEntry).toHaveBeenCalledWith({
      taskId: entry.taskId,
      taskName: entry.taskName,
      date: entry.date,
      startTime: entry.startTime,
      endTime: entry.endTime,
      description: entry.description,
    });
    expect(toast.success).toHaveBeenCalledWith('Entrada duplicada');
  });

  it('remove borra el Registro, limpia la selección y ofrece deshacer', async () => {
    const entry = makeEntry({ id: 'e5' });
    const { result, deleteEntry, onEntryDeleted } = setup({ entries: [entry] });

    await act(async () => {
      await result.current.remove('e5');
    });

    expect(deleteEntry).toHaveBeenCalledWith('e5');
    expect(onEntryDeleted).toHaveBeenCalledWith('e5');
    expect(toast).toHaveBeenCalledWith(
      'Entrada eliminada',
      expect.objectContaining({
        action: expect.objectContaining({
          label: 'Deshacer',
          onClick: expect.any(Function),
        }),
      })
    );
  });

  it('deshacer restaura el Registro borrado', async () => {
    const entry = makeEntry({ id: 'e5' });
    const { result, createEntry } = setup({ entries: [entry] });

    await act(async () => {
      await result.current.remove('e5');
    });

    const toastCall = vi.mocked(toast).mock.calls[0];
    const undoCallback = (toastCall[1] as unknown as { action: { onClick: () => Promise<void> } }).action.onClick;

    await act(async () => {
      await undoCallback();
    });

    expect(createEntry).toHaveBeenCalledWith({
      taskId: entry.taskId,
      taskName: entry.taskName,
      date: entry.date,
      startTime: entry.startTime,
      endTime: entry.endTime,
      description: entry.description,
    });
    expect(toast.success).toHaveBeenCalledWith('Entrada restaurada');
  });

  it('remove cierra el editor cuando se borra el Registro en edición', async () => {
    const entry = makeEntry({ id: 'e5' });
    const { result } = setup({ entries: [entry] });

    act(() => {
      result.current.openEdit(entry);
    });
    await act(async () => {
      await result.current.remove('e5');
    });

    expect(result.current.editingEntry).toBeNull();
  });

  it('remove no hace nada si el Registro no existe', async () => {
    const { result, deleteEntry, onEntryDeleted } = setup({ entries: [] });

    await act(async () => {
      await result.current.remove('missing');
    });

    expect(deleteEntry).not.toHaveBeenCalled();
    expect(onEntryDeleted).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });
});
