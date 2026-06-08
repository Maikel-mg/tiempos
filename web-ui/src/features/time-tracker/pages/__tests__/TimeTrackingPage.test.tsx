import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TimeTrackingPage } from '../TimeTrackingPage';
import { detectCrossing } from '../../lib/timerCrossingDetector';
import { useTimer } from '../../hooks/useTimer';
import { useTimeEntries } from '../../hooks/useTimeEntries';
import { toast } from 'sonner';
import type { TimeEntry } from '../../types';

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

const mockStop = vi.fn();
const mockCreateEntry = vi.fn();
const mockRefresh = vi.fn();
const mockUpdateEntry = vi.fn();
const mockDeleteEntry = vi.fn();

function makeEntry(id: string, synced = false): TimeEntry {
  return {
    id,
    taskId: 100,
    taskName: `Task ${id}`,
    proceso: { proceso: 100, nombre: 'Desarrollo' },
    date: '2026-01-15',
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600,
    description: `Description ${id}`,
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
    synced,
  };
}

function setupMocks(options: { stopResult?: unknown; crossingResult?: ReturnType<typeof detectCrossing>; entries?: TimeEntry[] }) {
  vi.mocked(useTimer).mockReturnValue({
    timerState: { isRunning: true, taskId: 1, taskName: 'Test', startTime: '', elapsed: 60 },
    isRunning: true,
    elapsed: 60,
    start: vi.fn(),
    stop: mockStop.mockResolvedValue(options.stopResult ?? null),
    cancel: vi.fn(),
    updateStartTime: vi.fn(),
  });

  vi.mocked(useTimeEntries).mockReturnValue({
    entries: options.entries ?? [],
    loading: false,
    createEntry: mockCreateEntry.mockResolvedValue({ id: '1' }),
    updateEntry: mockUpdateEntry.mockResolvedValue(null),
    deleteEntry: mockDeleteEntry.mockResolvedValue(undefined),
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

describe('TimeTrackingPage edit dialog', () => {
  it('click edit button opens dialog with pre-filled data', async () => {
    const user = userEvent.setup();
    const entries = [makeEntry('1', false)];
    setupMocks({ entries });

    renderWithProviders(<TimeTrackingPage />);

    // Switch to list tab
    const listTab = screen.getByRole('button', { name: /mis registros/i });
    await user.click(listTab);

    // Click edit (pencil) button on the pending row
    const entryRow = screen.getByText('Task 1').closest('tr')!;
    const rowEditBtn = entryRow.querySelectorAll('button')[1]; // edit button
    await user.click(rowEditBtn);

    // Dialog should open
    await waitFor(() => {
      expect(screen.getByText('Editar Registro')).toBeInTheDocument();
    });
  });

  it('cancel closes dialog without saving', async () => {
    const user = userEvent.setup();
    const entries = [makeEntry('1', false)];
    setupMocks({ entries });

    renderWithProviders(<TimeTrackingPage />);

    // Switch to list tab
    await user.click(screen.getByRole('button', { name: /mis registros/i }));

    // Open edit dialog
    const entryRow = screen.getByText('Task 1').closest('tr')!;
    const rowEditBtn = entryRow.querySelectorAll('button')[1];
    await user.click(rowEditBtn);

    await waitFor(() => {
      expect(screen.getByText('Editar Registro')).toBeInTheDocument();
    });

    // Click cancel — the one inside the dialog (last matching button)
    const cancelButtons = screen.getAllByRole('button', { name: /cancelar/i });
    const cancelBtn = cancelButtons[cancelButtons.length - 1];
    await user.click(cancelBtn);

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByText('Editar Registro')).not.toBeInTheDocument();
    });

    // No update should have been called
    expect(mockUpdateEntry).not.toHaveBeenCalled();
  });
});

describe('TimeTrackingPage undoable delete', () => {
  it('delete shows undo toast with action', async () => {
    const user = userEvent.setup();
    const entries = [makeEntry('1', false)];
    setupMocks({ entries });

    renderWithProviders(<TimeTrackingPage />);

    // Switch to list tab
    await user.click(screen.getByRole('button', { name: /mis registros/i }));

    // Click delete (trash) button
    const entryRow = screen.getByText('Task 1').closest('tr')!;
    const trashBtn = entryRow.querySelectorAll('button')[2]; // delete button
    await user.click(trashBtn);

    // Toast should have been called with "Entrada eliminada"
    await waitFor(() => {
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
  });

  it('undo callback calls createEntry to restore entry', async () => {
    const user = userEvent.setup();
    const entries = [makeEntry('1', false)];
    setupMocks({ entries });

    renderWithProviders(<TimeTrackingPage />);

    // Switch to list tab
    await user.click(screen.getByRole('button', { name: /mis registros/i }));

    // Click delete
    const entryRow = screen.getByText('Task 1').closest('tr')!;
    const trashBtn = entryRow.querySelectorAll('button')[2];
    await user.click(trashBtn);

    // Get the undo callback from the toast call
    const toastCall = vi.mocked(toast).mock.calls[0];
    const undoCallback = (toastCall[1] as any).action.onClick;

    // Simulate undo
    await undoCallback();

    // createEntry should have been called to restore
    expect(mockCreateEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 100,
        taskName: 'Task 1',
      })
    );
    expect(toast.success).toHaveBeenCalledWith('Entrada restaurada');
  });
});
