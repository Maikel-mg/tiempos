import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TimeTrackingPage } from '../TimeTrackingPage';
import { useTimer } from '../../hooks/useTimer';
import { useTimeEntries } from '../../hooks/useTimeEntries';
import { detectCrossing } from '../../lib/timerCrossingDetector';
import { toast } from 'sonner';
import type { TimeEntry, TimerState } from '../../types';

Element.prototype.hasPointerCapture = vi.fn(() => false);

vi.mock('../../hooks/useTimer');
vi.mock('../../hooks/useTimeEntries');
vi.mock('../../lib/timerCrossingDetector');
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    dismiss: vi.fn(),
  }),
  Toaster: () => null,
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

function mockEntries(splitRunningTimer: ReturnType<typeof vi.fn>) {
  vi.mocked(useTimeEntries).mockReturnValue({
    entries: [],
    loading: false,
    createEntry: vi.fn(),
    updateEntry: vi.fn(),
    deleteEntry: vi.fn(),
    splitEntry: vi.fn(),
    splitRunningTimer,
    markSynced: vi.fn(),
    refresh: vi.fn(),
    getEntriesByDateRange: vi.fn(),
  });
}

function runningTimerState(elapsed: number, description = 'Revisión de endpoints'): TimerState {
  const start = new Date(Date.now() - elapsed * 1000);
  return {
    isRunning: true,
    taskId: 42,
    taskName: 'Diseño API',
    startTime: start.toISOString(),
    elapsed,
    description,
  };
}

function mockTimer(timerState: TimerState | null, elapsed: number, updateDescription = vi.fn()) {
  vi.mocked(useTimer).mockReturnValue({
    timerState,
    isRunning: timerState !== null,
    elapsed,
    start: vi.fn(),
    stop: vi.fn(),
    cancel: vi.fn(),
    updateStartTime: vi.fn(),
    updateDescription,
  });
  return updateDescription;
}

const firstHalf: TimeEntry = {
  id: 'first-1',
  taskId: 42,
  taskName: 'Diseño API',
  proceso: { proceso: 42, nombre: 'Diseño API' },
  date: '2026-01-15',
  startTime: '09:00',
  endTime: '10:00',
  duration: 3600,
  description: 'Primera',
  createdAt: '2026-01-15T09:00:00Z',
  updatedAt: '2026-01-15T09:00:00Z',
  synced: false,
};

describe('TimeTrackingPage — dividir el timer en curso', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(detectCrossing).mockReturnValue({ crossed: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('mantiene la división disponible aunque el timer lleve rato corriendo', () => {
    vi.useFakeTimers();

    const start = new Date(2026, 0, 15, 9, 0, 0);
    vi.setSystemTime(start);

    // El estado del timer es estable: sólo avanza el reloj, no la identidad.
    const timerState: TimerState = {
      isRunning: true,
      taskId: 42,
      taskName: 'Diseño API',
      startTime: start.toISOString(),
      elapsed: 0,
      description: 'Revisión de endpoints',
    };

    mockTimer(timerState, 0);
    mockEntries(vi.fn());

    const { rerender } = renderWithProviders(<TimeTrackingPage />);

    // Pasa una hora: useTimer re-renderiza con `elapsed` nuevo, pero `timerState`
    // conserva la misma referencia.
    vi.setSystemTime(new Date(start.getTime() + 3600_000));
    mockTimer(timerState, 3600);

    rerender(
      <QueryClientProvider client={queryClient}>
        <TimeTrackingPage />
      </QueryClientProvider>
    );

    const splitButtons = screen.getAllByLabelText('Dividir el timer en curso');
    expect(splitButtons.length).toBeGreaterThan(0);
    expect(splitButtons.every((button) => !(button as HTMLButtonElement).disabled)).toBe(true);
  });

  it('envía las descripciones editadas y actualiza la del timer en curso', async () => {
    const user = userEvent.setup();
    const updateDescription = mockTimer(runningTimerState(3600), 3600);

    const splitRunningTimer = vi.fn().mockResolvedValue({
      ok: true,
      first: firstHalf,
      timerStartTime: new Date().toISOString(),
    });
    mockEntries(splitRunningTimer);

    renderWithProviders(<TimeTrackingPage />);

    await user.click(screen.getAllByLabelText('Dividir el timer en curso')[0]);

    const first = await screen.findByLabelText('Descripción de la primera mitad');
    await user.clear(first);
    await user.type(first, 'Primera');
    const second = screen.getByLabelText('Descripción de la segunda mitad');
    await user.clear(second);
    await user.type(second, 'Segunda');

    await user.click(screen.getByRole('button', { name: 'Dividir y seguir' }));

    await waitFor(() => {
      expect(splitRunningTimer).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'timer-activo' }),
        expect.any(String),
        'Primera',
      );
    });
    // La segunda mitad es el timer: su descripción se aplica sobre él.
    expect(updateDescription).toHaveBeenCalledWith('Segunda');
  });

  it('deshacer restaura la descripción original del timer en curso', async () => {
    const user = userEvent.setup();
    const timerState = runningTimerState(3600, 'Original');
    const updateDescription = vi.fn((value: string) => {
      timerState.description = value;
    });
    mockTimer(timerState, 3600, updateDescription);

    const splitRunningTimer = vi.fn().mockResolvedValue({
      ok: true,
      first: firstHalf,
      timerStartTime: new Date().toISOString(),
    });
    mockEntries(splitRunningTimer);

    renderWithProviders(<TimeTrackingPage />);

    await user.click(screen.getAllByLabelText('Dividir el timer en curso')[0]);

    const second = await screen.findByLabelText('Descripción de la segunda mitad');
    await user.clear(second);
    await user.type(second, 'Segunda');
    await user.click(screen.getByRole('button', { name: 'Dividir y seguir' }));

    await waitFor(() => expect(updateDescription).toHaveBeenCalledWith('Segunda'));

    const toastCall = vi.mocked(toast).mock.calls.find((call) => call[0] === 'Entrada dividida');
    const undo = (toastCall![1] as unknown as { action: { onClick: () => void } }).action.onClick;
    await undo();

    await waitFor(() => expect(updateDescription).toHaveBeenCalledWith('Original'));
  });

  it('deshacer restaura el Registro original entero, descripción incluida', async () => {
    const user = userEvent.setup();
    mockTimer(null, 0);

    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const original: TimeEntry = {
      id: 'entry-1',
      taskId: 42,
      taskName: 'Diseño API',
      proceso: { proceso: 42, nombre: 'Diseño API' },
      date,
      startTime: '09:00',
      endTime: '12:00',
      duration: 10800,
      description: 'Original',
      createdAt: `${date}T09:00:00Z`,
      updatedAt: `${date}T09:00:00Z`,
      synced: false,
    };

    const splitEntry = vi.fn().mockResolvedValue({
      ok: true,
      first: { ...original, endTime: '10:30', duration: 5400, description: 'Primera' },
      second: { ...original, id: 'entry-2', startTime: '10:30', duration: 5400, description: 'Segunda' },
    });
    const updateEntry = vi.fn().mockResolvedValue(null);

    vi.mocked(useTimeEntries).mockReturnValue({
      entries: [original],
      loading: false,
      createEntry: vi.fn(),
      updateEntry,
      deleteEntry: vi.fn(),
      splitEntry,
      splitRunningTimer: vi.fn(),
      markSynced: vi.fn(),
      refresh: vi.fn(),
      getEntriesByDateRange: vi.fn(),
    });

    renderWithProviders(<TimeTrackingPage />);

    await user.click(screen.getByLabelText('Dividir entrada'));

    const first = await screen.findByLabelText('Descripción de la primera mitad');
    await user.clear(first);
    await user.type(first, 'Primera');
    const second = screen.getByLabelText('Descripción de la segunda mitad');
    await user.clear(second);
    await user.type(second, 'Segunda');

    await user.click(screen.getByRole('button', { name: 'Dividir' }));

    await waitFor(() => {
      expect(splitEntry).toHaveBeenCalledWith('entry-1', '10:30', {
        first: 'Primera',
        second: 'Segunda',
      });
    });

    const toastCall = vi.mocked(toast).mock.calls.find((call) => call[0] === 'Entrada dividida');
    const undo = (toastCall![1] as unknown as { action: { onClick: () => void } }).action.onClick;
    await undo();

    await waitFor(() => {
      expect(updateEntry).toHaveBeenCalledWith(
        'entry-1',
        expect.objectContaining({ endTime: '12:00', description: 'Original' }),
      );
    });
  });
});
