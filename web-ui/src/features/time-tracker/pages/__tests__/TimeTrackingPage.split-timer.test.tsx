import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TimeTrackingPage } from '../TimeTrackingPage';
import { useTimer } from '../../hooks/useTimer';
import { useTimeEntries } from '../../hooks/useTimeEntries';
import { detectCrossing } from '../../lib/timerCrossingDetector';
import type { TimerState } from '../../types';

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

    const timerHook = (elapsed: number) => ({
      timerState,
      isRunning: true,
      elapsed,
      start: vi.fn(),
      stop: vi.fn(),
      cancel: vi.fn(),
      updateStartTime: vi.fn(),
      updateDescription: vi.fn(),
    });

    vi.mocked(useTimer).mockReturnValue(timerHook(0));
    mockEntries(vi.fn());

    const { rerender } = renderWithProviders(<TimeTrackingPage />);

    // Pasa una hora: useTimer re-renderiza con `elapsed` nuevo, pero `timerState`
    // conserva la misma referencia.
    vi.setSystemTime(new Date(start.getTime() + 3600_000));
    vi.mocked(useTimer).mockReturnValue(timerHook(3600));

    rerender(
      <QueryClientProvider client={queryClient}>
        <TimeTrackingPage />
      </QueryClientProvider>
    );

    const splitButtons = screen.getAllByLabelText('Dividir el timer en curso');
    expect(splitButtons.length).toBeGreaterThan(0);
    expect(splitButtons.every((button) => !(button as HTMLButtonElement).disabled)).toBe(true);
  });
});
