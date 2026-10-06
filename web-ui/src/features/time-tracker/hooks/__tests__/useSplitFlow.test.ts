import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { useSplitFlow } from '../useSplitFlow';
import { toast } from 'sonner';
import type { TimeEntry, TimerState } from '../../types';

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'entry-1',
    taskId: 42,
    taskName: 'Diseño API',
    proceso: { proceso: 42, nombre: 'Diseño API' },
    date: '2026-06-10',
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600,
    description: 'Original',
    createdAt: '2026-06-10T09:00:00Z',
    updatedAt: '2026-06-10T09:00:00Z',
    synced: false,
    ...overrides,
  };
}

function runningTimer(description: string | undefined): TimerState {
  return {
    isRunning: true,
    taskId: 42,
    taskName: 'Diseño API',
    startTime: '2026-06-10T09:00:00.000Z',
    elapsed: 3600,
    description,
  };
}

interface SetupOptions {
  liveTimerEntry?: TimeEntry | null;
  timerDescription?: string;
  selectedIds?: string[];
}

function setup({
  liveTimerEntry = null,
  timerDescription,
  selectedIds = [],
}: SetupOptions = {}) {
  const splitEntry = vi.fn();
  const splitRunningTimer = vi.fn();
  const deleteEntry = vi.fn().mockResolvedValue(undefined);
  const updateEntry = vi.fn().mockResolvedValue(null);

  const timerState = liveTimerEntry ? runningTimer(timerDescription) : null;
  const timer = {
    timerState,
    updateStartTime: vi.fn().mockResolvedValue(undefined),
    updateDescription: vi.fn((value: string) => {
      if (timerState) timerState.description = value;
      return Promise.resolve();
    }),
  };

  const utils = renderHook(() => {
    const [ids, setIds] = useState<Set<string>>(new Set(selectedIds));
    const flow = useSplitFlow({
      splitEntry,
      splitRunningTimer,
      deleteEntry,
      updateEntry,
      timer,
      liveTimerEntry,
      selectedIds: ids,
      setSelectedIds: setIds,
    });
    return { ...flow, selectedIds: ids };
  });

  return { ...utils, splitEntry, splitRunningTimer, deleteEntry, updateEntry, timer };
}

/** Resuelve un Registro guardado en dos mitades, con el corte en `10:30`. */
function savedSplitOutcome(entry: TimeEntry) {
  return {
    ok: true as const,
    first: { ...entry, endTime: '10:30', duration: 5400, description: 'Primera' },
    second: {
      ...entry,
      id: 'entry-2',
      startTime: '10:30',
      duration: 5400,
      description: 'Segunda',
    },
  };
}

const SAVED_CUT = {
  entryId: 'entry-1',
  cutTime: '10:30',
  firstDescription: 'Primera',
  secondDescription: 'Segunda',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useSplitFlow', () => {
  describe('split de un Registro guardado', () => {
    it('handleSplitEntry abre el diálogo con el Registro y no como timer', () => {
      const entry = makeEntry({ id: 'entry-1' });
      const { result } = setup();

      act(() => {
        result.current.handleSplitEntry(entry);
      });

      expect(result.current.splittingEntry).toBe(entry);
      expect(result.current.splittingTimer).toBe(false);
    });

    it('el confirm divide el Registro con las descripciones y ofrece deshacer', async () => {
      const entry = makeEntry({ id: 'entry-1' });
      const { result, splitEntry } = setup();
      splitEntry.mockResolvedValue(savedSplitOutcome(entry));

      act(() => {
        result.current.handleSplitEntry(entry);
      });
      await act(async () => {
        await result.current.handleSplitConfirm(SAVED_CUT);
      });

      expect(splitEntry).toHaveBeenCalledWith('entry-1', '10:30', {
        first: 'Primera',
        second: 'Segunda',
      });
      expect(toast).toHaveBeenCalledWith(
        'Entrada dividida',
        expect.objectContaining({
          action: expect.objectContaining({
            label: 'Deshacer',
            onClick: expect.any(Function),
          }),
        }),
      );
    });

    it('ante un plan inválido avisa y no ofrece deshacer', async () => {
      const entry = makeEntry({ id: 'entry-1' });
      const { result, splitEntry } = setup();
      splitEntry.mockResolvedValue({
        ok: false,
        reason: 'El corte tiene que caer dentro del Registro',
      });

      act(() => {
        result.current.handleSplitEntry(entry);
      });
      await act(async () => {
        await result.current.handleSplitConfirm(SAVED_CUT);
      });

      expect(toast.error).toHaveBeenCalledWith('El corte tiene que caer dentro del Registro');
      expect(toast).not.toHaveBeenCalled();
    });

    it('sin Registro en la mano no divide nada', async () => {
      const { result, splitEntry } = setup();

      await act(async () => {
        await result.current.handleSplitConfirm(SAVED_CUT);
      });

      expect(splitEntry).not.toHaveBeenCalled();
      expect(toast).not.toHaveBeenCalled();
    });

    it('deshacer restaura el Registro original entero', async () => {
      const entry = makeEntry({ id: 'entry-1', endTime: '12:00', duration: 10800 });
      const { result, splitEntry, deleteEntry, updateEntry } = setup();
      splitEntry.mockResolvedValue(savedSplitOutcome(entry));

      act(() => {
        result.current.handleSplitEntry(entry);
      });
      await act(async () => {
        await result.current.handleSplitConfirm(SAVED_CUT);
      });
      await act(async () => {
        await result.current.handleUndoSplit();
      });

      expect(deleteEntry).toHaveBeenCalledWith('entry-2');
      expect(updateEntry).toHaveBeenCalledWith('entry-1', {
        endTime: '12:00',
        duration: 10800,
        description: 'Original',
      });
      expect(toast.success).toHaveBeenCalledWith('División deshecha');
    });

    it('añade la segunda mitad a la selección cuando el Registro estaba seleccionado', async () => {
      const entry = makeEntry({ id: 'entry-1' });
      const { result, splitEntry } = setup({ selectedIds: ['entry-1'] });
      splitEntry.mockResolvedValue(savedSplitOutcome(entry));

      act(() => {
        result.current.handleSplitEntry(entry);
      });
      await act(async () => {
        await result.current.handleSplitConfirm(SAVED_CUT);
      });

      expect([...result.current.selectedIds]).toEqual(['entry-1', 'entry-2']);
    });

    it('deshacer retira la segunda mitad de la selección', async () => {
      const entry = makeEntry({ id: 'entry-1' });
      const { result, splitEntry } = setup({ selectedIds: ['entry-1'] });
      splitEntry.mockResolvedValue(savedSplitOutcome(entry));

      act(() => {
        result.current.handleSplitEntry(entry);
      });
      await act(async () => {
        await result.current.handleSplitConfirm(SAVED_CUT);
      });
      await act(async () => {
        await result.current.handleUndoSplit();
      });

      expect(result.current.selectedIds.has('entry-2')).toBe(false);
      expect(result.current.selectedIds.has('entry-1')).toBe(true);
    });
  });

  describe('split del Timer activo', () => {
    const liveEntry = makeEntry({
      id: 'timer-activo',
      description: 'Revisión',
      endTime: '11:00',
    });

    it('handleSplitTimer abre el diálogo con la entrada del timer en vivo', () => {
      const { result } = setup({ liveTimerEntry: liveEntry, timerDescription: 'Revisión' });

      act(() => {
        result.current.handleSplitTimer();
      });

      expect(result.current.splittingEntry).toBe(liveEntry);
      expect(result.current.splittingTimer).toBe(true);
    });

    it('el confirm persiste la primera mitad, re-ancla el timer y deja la descripción de la segunda', async () => {
      const { result, splitRunningTimer, splitEntry, timer } = setup({
        liveTimerEntry: liveEntry,
        timerDescription: 'Revisión',
      });
      splitRunningTimer.mockResolvedValue({
        ok: true,
        first: makeEntry({ id: 'first-1' }),
        timerStartTime: '2026-06-10T10:30:00.000Z',
      });

      act(() => {
        result.current.handleSplitTimer();
      });
      await act(async () => {
        await result.current.handleSplitConfirm({
          entryId: 'timer-activo',
          cutTime: '10:30',
          firstDescription: 'Primera',
          secondDescription: 'Segunda',
        });
      });

      expect(splitRunningTimer).toHaveBeenCalledWith(liveEntry, '10:30', 'Primera');
      expect(timer.updateStartTime).toHaveBeenCalledWith('2026-06-10T10:30:00.000Z');
      expect(timer.updateDescription).toHaveBeenCalledWith('Segunda');
      expect(splitEntry).not.toHaveBeenCalled();
    });

    it('no toca el timer si no hay una entrada en curso que dividir', async () => {
      const { result, splitRunningTimer, timer } = setup({ liveTimerEntry: null });

      act(() => {
        result.current.handleSplitTimer();
      });
      await act(async () => {
        await result.current.handleSplitConfirm({
          entryId: 'timer-activo',
          cutTime: '10:30',
          firstDescription: 'Primera',
          secondDescription: 'Segunda',
        });
      });

      expect(splitRunningTimer).not.toHaveBeenCalled();
      expect(timer.updateStartTime).not.toHaveBeenCalled();
    });

    it('ante un plan inválido avisa y no re-ancla el timer', async () => {
      const { result, splitRunningTimer, timer } = setup({
        liveTimerEntry: liveEntry,
        timerDescription: 'Revisión',
      });
      splitRunningTimer.mockResolvedValue({
        ok: false,
        reason: 'El corte tiene que caer dentro del Registro',
      });

      act(() => {
        result.current.handleSplitTimer();
      });
      await act(async () => {
        await result.current.handleSplitConfirm({
          entryId: 'timer-activo',
          cutTime: '10:30',
          firstDescription: 'Primera',
          secondDescription: 'Segunda',
        });
      });

      expect(toast.error).toHaveBeenCalledWith('El corte tiene que caer dentro del Registro');
      expect(timer.updateStartTime).not.toHaveBeenCalled();
      expect(timer.updateDescription).not.toHaveBeenCalled();
    });

    it('deshacer borra la primera mitad y restaura descripción y anclaje del timer', async () => {
      const { result, splitRunningTimer, deleteEntry, timer } = setup({
        liveTimerEntry: liveEntry,
        timerDescription: 'Revisión',
      });
      splitRunningTimer.mockResolvedValue({
        ok: true,
        first: makeEntry({ id: 'first-1' }),
        timerStartTime: '2026-06-10T10:30:00.000Z',
      });

      act(() => {
        result.current.handleSplitTimer();
      });
      await act(async () => {
        await result.current.handleSplitConfirm({
          entryId: 'timer-activo',
          cutTime: '10:30',
          firstDescription: 'Primera',
          secondDescription: 'Segunda',
        });
      });
      await act(async () => {
        await result.current.handleUndoSplit();
      });

      expect(deleteEntry).toHaveBeenCalledWith('first-1');
      expect(timer.updateDescription).toHaveBeenCalledWith('Revisión');
      expect(timer.updateStartTime).toHaveBeenLastCalledWith('2026-06-10T09:00:00.000Z');
      expect(toast.success).toHaveBeenCalledWith('División deshecha');
    });
  });

  describe('deshacer invalidado por sincronización', () => {
    it('sincronizar una mitad invalida el deshacer', async () => {
      const entry = makeEntry({ id: 'entry-1' });
      const { result, splitEntry, deleteEntry, updateEntry } = setup();
      splitEntry.mockResolvedValue(savedSplitOutcome(entry));

      act(() => {
        result.current.handleSplitEntry(entry);
      });
      await act(async () => {
        await result.current.handleSplitConfirm(SAVED_CUT);
      });
      act(() => {
        result.current.invalidateSplitUndo(['entry-2']);
      });
      await act(async () => {
        await result.current.handleUndoSplit();
      });

      expect(deleteEntry).not.toHaveBeenCalled();
      expect(updateEntry).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(
        'No se puede deshacer: una de las mitades ya se sincronizó',
      );
    });

    it('sincronizar un Registro ajeno no invalida el deshacer', async () => {
      const entry = makeEntry({ id: 'entry-1' });
      const { result, splitEntry, deleteEntry } = setup();
      splitEntry.mockResolvedValue(savedSplitOutcome(entry));

      act(() => {
        result.current.handleSplitEntry(entry);
      });
      await act(async () => {
        await result.current.handleSplitConfirm(SAVED_CUT);
      });
      act(() => {
        result.current.invalidateSplitUndo(['otro']);
      });
      await act(async () => {
        await result.current.handleUndoSplit();
      });

      expect(deleteEntry).toHaveBeenCalledWith('entry-2');
      expect(toast.success).toHaveBeenCalledWith('División deshecha');
    });

    it('deshacer sin nada que deshacer no hace nada', async () => {
      const { result, deleteEntry } = setup();

      await act(async () => {
        await result.current.handleUndoSplit();
      });

      expect(deleteEntry).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  describe('ciclo del diálogo', () => {
    it('cerrar el diálogo descarta lo que se estaba dividiendo', () => {
      const entry = makeEntry({ id: 'entry-1' });
      const { result } = setup();

      act(() => {
        result.current.handleSplitEntry(entry);
      });
      act(() => {
        result.current.handleSplitDialogOpenChange(false);
      });

      expect(result.current.splittingEntry).toBeNull();
      expect(result.current.splittingTimer).toBe(false);
    });

    it('abrir el diálogo no descarta lo que se estaba dividiendo', () => {
      const entry = makeEntry({ id: 'entry-1' });
      const { result } = setup();

      act(() => {
        result.current.handleSplitEntry(entry);
      });
      act(() => {
        result.current.handleSplitDialogOpenChange(true);
      });

      expect(result.current.splittingEntry).toBe(entry);
    });
  });
});
