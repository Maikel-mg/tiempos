import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTimerView } from '../useTimerView';
import { useTimer } from '../useTimer';
import { toast } from 'sonner';
import type { TimeEntry, TimerState } from '../../types';

vi.mock('../useTimer', () => ({ useTimer: vi.fn() }));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

// Fijamos "hoy" a un instante determinista para que la fecha y las horas del
// registro virtual del timer no dependan del reloj real.
const NOW = new Date(2026, 5, 10, 12, 0, 0); // 2026-06-10 12:00 local

function runningTimer(startTime: Date, elapsed: number, description?: string): TimerState {
  return {
    isRunning: true,
    taskId: 42,
    taskName: 'Diseño API',
    startTime: startTime.toISOString(),
    elapsed,
    description,
  };
}

type TimerMock = ReturnType<typeof useTimer>;

function mockTimer(overrides: Partial<TimerMock> = {}): TimerMock {
  const timer: TimerMock = {
    timerState: null,
    isRunning: false,
    elapsed: 0,
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(null),
    updateStartTime: vi.fn().mockResolvedValue(undefined),
    updateDescription: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  vi.mocked(useTimer).mockReturnValue(timer);
  return timer;
}

function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: 'e1',
    taskId: 42,
    taskName: 'Diseño API',
    proceso: { proceso: 42, nombre: 'Diseño API' },
    date: '2026-06-10',
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600,
    description: 'Descripción',
    createdAt: '2026-06-10T09:00:00Z',
    updatedAt: '2026-06-10T09:00:00Z',
    synced: false,
    ...overrides,
  };
}

function setup(createEntry = vi.fn().mockResolvedValue(null)) {
  const utils = renderHook(() => useTimerView({ createEntry }));
  return { ...utils, createEntry };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useTimerView', () => {
  describe('registro virtual del timer', () => {
    it('expone la fila virtual con la fecha y las horas reales mientras corre', () => {
      const start = new Date(NOW.getTime() - 42 * 1000); // 11:59:18
      mockTimer({ isRunning: true, timerState: runningTimer(start, 42, 'Revisión'), elapsed: 42 });

      const { result } = setup();

      expect(result.current.virtualTimerEntry).toEqual({
        taskId: 42,
        taskName: 'Diseño API',
        date: '2026-06-10',
        startTime: '11:59',
        endTime: '12:00',
        duration: 42,
        description: 'Revisión',
      });
    });

    it('no expone fila virtual cuando el timer no corre', () => {
      mockTimer({ isRunning: false, timerState: null });

      const { result } = setup();

      expect(result.current.virtualTimerEntry).toBeNull();
    });
  });

  describe('elapsed throttled', () => {
    it('arranca con el elapsed del timer y vuelve a 0 al parar', () => {
      const start = new Date(NOW.getTime() - 42 * 1000);
      mockTimer({ isRunning: true, timerState: runningTimer(start, 42), elapsed: 42 });
      const { result, rerender } = setup();

      expect(result.current.throttledElapsed).toBe(42);

      mockTimer({ isRunning: false, timerState: null, elapsed: 0 });
      rerender();

      expect(result.current.throttledElapsed).toBe(0);
    });
  });

  describe('play handler', () => {
    it('inicia el timer con la tarea del Registro cuando no hay ninguno en curso', async () => {
      const timer = mockTimer({ isRunning: false, timerState: null });
      const { result } = setup();
      const entry = makeEntry({ taskId: 7, taskName: 'Nueva', description: 'nueva' });

      await act(async () => {
        await result.current.handlePlayEntry(entry);
      });

      expect(timer.stop).not.toHaveBeenCalled();
      expect(timer.start).toHaveBeenCalledWith(7, 'Nueva', 'nueva');
    });

    it('al cambiar de tarea detiene el timer, persiste el anterior y arranca el nuevo', async () => {
      const end = new Date(2026, 5, 10, 12, 0, 0);
      const start = new Date(2026, 5, 10, 11, 0, 0);
      const timer = mockTimer({
        isRunning: true,
        timerState: runningTimer(new Date(NOW.getTime() - 42 * 1000), 42),
        elapsed: 42,
      });
      vi.mocked(timer.stop).mockResolvedValue({ taskId: 9, taskName: 'Anterior', start, end });
      const { result, createEntry } = setup();
      const entry = makeEntry({ taskId: 7, taskName: 'Nueva', description: 'nueva' });
      await act(async () => {
        await result.current.handlePlayEntry(entry);
      });

      expect(timer.stop).toHaveBeenCalledWith({ persist: false });
      expect(createEntry).toHaveBeenCalledWith({
        taskId: 9,
        taskName: 'Anterior',
        date: '2026-06-10',
        startTime: '11:00',
        endTime: '12:00',
        description: undefined,
      });
      expect(timer.start).toHaveBeenCalledWith(7, 'Nueva', 'nueva');
      expect(toast).toHaveBeenCalledWith('Timer de Anterior detenido. Iniciando Nueva.');
    });

    it('recuerda la descripción del Registro para el siguiente cierre', async () => {
      const end = new Date(2026, 5, 10, 12, 0, 0);
      const start = new Date(2026, 5, 10, 11, 0, 0);
      const timer = mockTimer({
        isRunning: true,
        timerState: runningTimer(new Date(NOW.getTime() - 42 * 1000), 42),
        elapsed: 42,
      });
      vi.mocked(timer.stop).mockResolvedValue({ taskId: 9, taskName: 'Anterior', start, end });
      const { result, createEntry } = setup();

      await act(async () => {
        await result.current.handlePlayEntry(makeEntry({ id: 'a', description: 'Primera' }));
      });
      await act(async () => {
        await result.current.handlePlayEntry(makeEntry({ id: 'b', description: 'Segunda' }));
      });

      // El segundo cierre persiste la descripción del primer Registro reproducido.
      expect(createEntry).toHaveBeenLastCalledWith(
        expect.objectContaining({ description: 'Primera' }),
      );
    });
  });

  describe('handle de la barra del timer', () => {
    it('expone un ref estable que la página conecta a la barra', () => {
      mockTimer();
      const { result, rerender } = setup();

      expect(result.current.trackerBarRef.current).toBeNull();

      const ref = result.current.trackerBarRef;
      rerender();

      expect(result.current.trackerBarRef).toBe(ref);
    });
  });

  describe('motivo por el que el split del timer está deshabilitado', () => {
    it('no hay motivo cuando el timer no corre', () => {
      mockTimer({ isRunning: false, timerState: null });

      const { result } = setup();

      expect(result.current.timerSplitDisabledReason).toBeUndefined();
    });

    it('no hay motivo cuando el timer arrancó hoy y lleva rato', () => {
      mockTimer({
        isRunning: true,
        timerState: runningTimer(new Date(NOW.getTime() - 3600 * 1000), 3600),
        elapsed: 3600,
      });

      const { result } = setup();

      expect(result.current.timerSplitDisabledReason).toBeUndefined();
    });

    it('avisa cuando el timer acaba de arrancar', () => {
      mockTimer({
        isRunning: true,
        timerState: runningTimer(new Date(NOW.getTime() - 500), 0),
        elapsed: 0,
      });

      const { result } = setup();

      expect(result.current.timerSplitDisabledReason).toBe(
        'Un Registro de menos de 2 minutos no se puede dividir',
      );
    });

    it('avisa cuando el timer es demasiado corto para dividir', () => {
      mockTimer({
        isRunning: true,
        timerState: runningTimer(new Date(NOW.getTime() - 30 * 1000), 30),
        elapsed: 30,
      });

      const { result } = setup();

      expect(result.current.timerSplitDisabledReason).toBe(
        'Un Registro de menos de 2 minutos no se puede dividir',
      );
    });

    it('avisa cuando el timer cruza la medianoche', () => {
      const start = new Date(2026, 5, 9, 23, 0, 0); // día anterior
      mockTimer({
        isRunning: true,
        timerState: runningTimer(start, 3600),
        elapsed: 3600,
      });

      const { result } = setup();

      expect(result.current.timerSplitDisabledReason).toBe(
        'El timer cruza la medianoche; al pararlo decidirás cómo dividirlo',
      );
    });
  });
});
