import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TimeTrackingPage } from '../TimeTrackingPage';
import { detectCrossing } from '../../lib/timerCrossingDetector';
import { useTimer } from '../../hooks/useTimer';
import { useTimeEntries } from '../../hooks/useTimeEntries';

vi.mock('../../hooks/useTimer');
vi.mock('../../hooks/useTimeEntries');
vi.mock('../../lib/timerCrossingDetector');

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

const mockStop = vi.fn();
const mockCreateEntry = vi.fn();
const mockRefresh = vi.fn();

function setupMocks(options: { stopResult?: unknown; crossingResult?: ReturnType<typeof detectCrossing> }) {
  vi.mocked(useTimer).mockReturnValue({
    timerState: { isRunning: true, taskId: 1, taskName: 'Test', startTime: '', elapsed: 60 },
    isRunning: true,
    elapsed: 60,
    start: vi.fn(),
    stop: mockStop.mockResolvedValue(options.stopResult ?? null),
    cancel: vi.fn(),
  });

  vi.mocked(useTimeEntries).mockReturnValue({
    entries: [],
    loading: false,
    createEntry: mockCreateEntry.mockResolvedValue({ id: '1' }),
    updateEntry: vi.fn(),
    deleteEntry: vi.fn(),
    markSynced: vi.fn(),
    refresh: mockRefresh,
    getEntriesByDateRange: vi.fn(),
  });

  vi.mocked(detectCrossing).mockReturnValue(
    options.crossingResult ?? { crossed: false }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TimeTrackingPage handleTimerStop', () => {
  it('shows no modal when timer did not cross midnight', async () => {
    const user = userEvent.setup();
    setupMocks({
      stopResult: { start: new Date(2026, 5, 1, 9, 0), end: new Date(2026, 5, 1, 17, 0), taskId: 1, taskName: 'Test' },
      crossingResult: { crossed: false },
    });

    renderWithProviders(<TimeTrackingPage />);

    const stopBtn = screen.getByRole('button', { name: /parar/i });
    await user.click(stopBtn);

    await waitFor(() => {
      expect(mockStop).toHaveBeenCalled();
    });

    expect(screen.queryByText(/cruza la medianoche/i)).not.toBeInTheDocument();
    // No modal, but entry IS created (single entry, no split)
    await waitFor(() => {
      expect(mockCreateEntry).toHaveBeenCalledTimes(1);
    });
  });

  it('shows modal when crossing detected, split creates N entries', async () => {
    const user = userEvent.setup();
    const start = new Date(2026, 5, 1, 23, 30);
    const end = new Date(2026, 5, 2, 0, 15);
    setupMocks({
      stopResult: { start, end, taskId: 1, taskName: 'Test' },
      crossingResult: {
        crossed: true,
        splits: [
          { date: '2026-06-01', startTime: '23:30', endTime: '23:59', minutes: 29 },
          { date: '2026-06-02', startTime: '00:00', endTime: '00:15', minutes: 16 },
        ],
      },
    });

    renderWithProviders(<TimeTrackingPage />);

    const stopBtn = screen.getByRole('button', { name: /parar/i });
    await user.click(stopBtn);

    await waitFor(() => {
      expect(screen.getByText(/cruza la medianoche/i)).toBeInTheDocument();
    });

    const splitBtn = screen.getByRole('button', { name: /dividir/i });
    await user.click(splitBtn);

    await waitFor(() => {
      expect(mockCreateEntry).toHaveBeenCalledTimes(2);
    });
  });

  it('keep-single creates 1 entry with end date', async () => {
    const user = userEvent.setup();
    const start = new Date(2026, 5, 1, 23, 30);
    const end = new Date(2026, 5, 2, 0, 15);
    setupMocks({
      stopResult: { start, end, taskId: 1, taskName: 'Test' },
      crossingResult: {
        crossed: true,
        splits: [
          { date: '2026-06-01', startTime: '23:30', endTime: '23:59', minutes: 29 },
          { date: '2026-06-02', startTime: '00:00', endTime: '00:15', minutes: 16 },
        ],
      },
    });

    renderWithProviders(<TimeTrackingPage />);

    const stopBtn = screen.getByRole('button', { name: /parar/i });
    await user.click(stopBtn);

    await waitFor(() => {
      expect(screen.getByText(/cruza la medianoche/i)).toBeInTheDocument();
    });

    const keepBtn = screen.getByRole('button', { name: /dejar como uno/i });
    await user.click(keepBtn);

    await waitFor(() => {
      expect(mockCreateEntry).toHaveBeenCalledTimes(1);
    });
    expect(mockCreateEntry).toHaveBeenCalledWith(
      expect.objectContaining({ date: '2026-06-02' })
    );
  });

  it('X close treated as keep-single, creates 1 entry', async () => {
    const user = userEvent.setup();
    const start = new Date(2026, 5, 1, 23, 30);
    const end = new Date(2026, 5, 2, 0, 15);
    setupMocks({
      stopResult: { start, end, taskId: 1, taskName: 'Test' },
      crossingResult: {
        crossed: true,
        splits: [
          { date: '2026-06-01', startTime: '23:30', endTime: '23:59', minutes: 29 },
          { date: '2026-06-02', startTime: '00:00', endTime: '00:15', minutes: 16 },
        ],
      },
    });

    renderWithProviders(<TimeTrackingPage />);

    const stopBtn = screen.getByRole('button', { name: /parar/i });
    await user.click(stopBtn);

    await waitFor(() => {
      expect(screen.getByText(/cruza la medianoche/i)).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole('button', { name: /close/i });
    await user.click(closeBtn);

    await waitFor(() => {
      expect(mockCreateEntry).toHaveBeenCalledTimes(1);
    });
  });
});
