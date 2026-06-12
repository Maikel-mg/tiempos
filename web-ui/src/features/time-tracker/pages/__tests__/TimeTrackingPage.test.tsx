import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TimeTrackingPage } from '../TimeTrackingPage';
import { detectCrossing } from '../../lib/timerCrossingDetector';
import { useTimer } from '../../hooks/useTimer';
import { useTimeEntries } from '../../hooks/useTimeEntries';
import { toast } from 'sonner';
import type { TimeEntry } from '../../types';

// Mock pointer capture for Radix UI Select in jsdom
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

const mockStop = vi.fn();
const mockCreateEntry = vi.fn();
const mockRefresh = vi.fn();
const mockUpdateEntry = vi.fn();
const mockDeleteEntry = vi.fn();

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function makeEntry(id: string, synced = false, dateOverride?: string): TimeEntry {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - diffToMonday);
  const entryDate = dateOverride || toLocalDateString(monday);

  return {
    id,
    taskId: 100,
    taskName: `Task ${id}`,
    proceso: { proceso: 100, nombre: 'Desarrollo' },
    date: entryDate,
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600,
    description: `Description ${id}`,
    createdAt: `${entryDate}T09:00:00Z`,
    updatedAt: `${entryDate}T09:00:00Z`,
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
    updateDescription: vi.fn(),
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

    await user.click(screen.getByRole('button', { name: /detener/i }));

    await waitFor(() => {
      expect(mockStop).toHaveBeenCalledWith({ persist: false });
    });

    expect(mockCreateEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 1,
        taskName: 'Test',
      })
    );
  });
});

describe('TimeTrackingPage edit', () => {
  it('clicking edit shows inline edit indicator', async () => {
    const user = userEvent.setup();
    const entries = [makeEntry('1', false)];
    setupMocks({ entries });

    renderWithProviders(<TimeTrackingPage />);

    // Table is shown by default
    const entryRow = screen.getByText('Task 1').closest('tr')!;
    // Buttons in order: checkbox[0], play[1], edit[2], duplicate[3], delete[4]
    const rowEditBtn = entryRow.querySelectorAll('button')[2];
    await user.click(rowEditBtn);

    // Inline edit indicator should appear — text is split across elements
    await waitFor(() => {
      expect(screen.getByText(/Editando:/)).toBeInTheDocument();
    });
  });

  it('cancel exits edit mode without saving', async () => {
    const user = userEvent.setup();
    const entries = [makeEntry('1', false)];
    setupMocks({ entries });

    renderWithProviders(<TimeTrackingPage />);

    // Table is shown by default
    const entryRow = screen.getByText('Task 1').closest('tr')!;
    const rowEditBtn = entryRow.querySelectorAll('button')[2];
    await user.click(rowEditBtn);

    await waitFor(() => {
      expect(screen.getByText(/Editando:/)).toBeInTheDocument();
    });

    // Click cancel button
    const cancelBtn = screen.getByRole('button', { name: /cancelar edición/i });
    await user.click(cancelBtn);

    // Edit indicator should disappear
    await waitFor(() => {
      expect(screen.queryByText(/Editando:/)).not.toBeInTheDocument();
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

    // Table is shown by default
    const entryRow = screen.getByText('Task 1').closest('tr')!;
    // Buttons: checkbox[0], play[1], edit[2], duplicate[3], delete[4]
    const trashBtn = entryRow.querySelectorAll('button')[4];
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

    // Table is shown by default
    const entryRow = screen.getByText('Task 1').closest('tr')!;
    // Buttons: checkbox[0], play[1], edit[2], duplicate[3], delete[4]
    const trashBtn = entryRow.querySelectorAll('button')[4];
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

describe('TimeTrackingPage edit recoverable status', () => {
  it('shows recoverable toggle ON when editing a recoverable entry', async () => {
    const user = userEvent.setup();
    const entry = makeEntry('1', false);
    entry.recoverable = true;
    setupMocks({ entries: [entry] });

    renderWithProviders(<TimeTrackingPage />);

    // Click edit on the entry
    const entryRow = screen.getByText('Task 1').closest('tr')!;
    const rowEditBtn = entryRow.querySelectorAll('button')[2];
    await user.click(rowEditBtn);

    // The recoverable toggle should reflect the entry's state (ON)
    await waitFor(() => {
      const toggle = screen.getByRole('button', { name: /permiso/i });
      expect(toggle).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('shows recoverable toggle OFF when editing a non-recoverable entry', async () => {
    const user = userEvent.setup();
    const entry = makeEntry('1', false);
    entry.recoverable = false;
    setupMocks({ entries: [entry] });

    renderWithProviders(<TimeTrackingPage />);

    const entryRow = screen.getByText('Task 1').closest('tr')!;
    const rowEditBtn = entryRow.querySelectorAll('button')[2];
    await user.click(rowEditBtn);

    await waitFor(() => {
      const toggle = screen.getByRole('button', { name: /permiso/i });
      expect(toggle).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('toggling recoverable during edit changes the state', async () => {
    const user = userEvent.setup();
    const entry = makeEntry('1', false);
    entry.recoverable = false;
    setupMocks({ entries: [entry] });

    renderWithProviders(<TimeTrackingPage />);

    // Enter edit mode
    const entryRow = screen.getByText('Task 1').closest('tr')!;
    const rowEditBtn = entryRow.querySelectorAll('button')[2];
    await user.click(rowEditBtn);

    await waitFor(() => {
      expect(screen.getByText(/Editando:/)).toBeInTheDocument();
    });

    // Toggle recoverable ON
    const toggle = screen.getByRole('button', { name: /permiso/i });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    // Toggle back OFF
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('submitting edit persists recoverable=true via updateEntry', async () => {
    const user = userEvent.setup();
    const entry = makeEntry('1', false);
    entry.recoverable = false;
    setupMocks({ entries: [entry] });

    renderWithProviders(<TimeTrackingPage />);

    // Enter edit mode
    const entryRow = screen.getByText('Task 1').closest('tr')!;
    const rowEditBtn = entryRow.querySelectorAll('button')[2];
    await user.click(rowEditBtn);

    await waitFor(() => {
      expect(screen.getByText(/Editando:/)).toBeInTheDocument();
    });

    // Toggle recoverable ON
    const toggle = screen.getByRole('button', { name: /permiso/i });
    await user.click(toggle);

    // Submit the edit
    const submitBtn = screen.getByRole('button', { name: /añadir/i });
    await user.click(submitBtn);

    // updateEntry should have been called with recoverable: true
    await waitFor(() => {
      expect(mockUpdateEntry).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          recoverable: true,
        })
      );
    });
  });

  it('submitting edit persists recoverable=false when toggled off', async () => {
    const user = userEvent.setup();
    const entry = makeEntry('1', false);
    entry.recoverable = true;
    setupMocks({ entries: [entry] });

    renderWithProviders(<TimeTrackingPage />);

    // Enter edit mode
    const entryRow = screen.getByText('Task 1').closest('tr')!;
    const rowEditBtn = entryRow.querySelectorAll('button')[2];
    await user.click(rowEditBtn);

    await waitFor(() => {
      expect(screen.getByText(/Editando:/)).toBeInTheDocument();
    });

    // Toggle recoverable OFF (it starts ON because entry is recoverable)
    const toggle = screen.getByRole('button', { name: /permiso/i });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    // Submit the edit
    const submitBtn = screen.getByRole('button', { name: /añadir/i });
    await user.click(submitBtn);

    // updateEntry should have been called with recoverable: false
    await waitFor(() => {
      expect(mockUpdateEntry).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          recoverable: false,
        })
      );
    });
  });

  it('exits edit mode after successful submit', async () => {
    const user = userEvent.setup();
    const entry = makeEntry('1', false);
    entry.recoverable = false;
    setupMocks({ entries: [entry] });

    renderWithProviders(<TimeTrackingPage />);

    // Enter edit mode
    const entryRow = screen.getByText('Task 1').closest('tr')!;
    const rowEditBtn = entryRow.querySelectorAll('button')[2];
    await user.click(rowEditBtn);

    await waitFor(() => {
      expect(screen.getByText(/Editando:/)).toBeInTheDocument();
    });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /añadir/i });
    await user.click(submitBtn);

    // Edit indicator should disappear after submit
    await waitFor(() => {
      expect(screen.queryByText(/Editando:/)).not.toBeInTheDocument();
    });
  });
});

describe('TimeTrackingPage PeriodProgressPanel', () => {
  it('renders PeriodProgressPanel below PeriodSelector', () => {
    setupMocks({ entries: [] });

    renderWithProviders(<TimeTrackingPage />);

    // The panel should be present in the DOM
    const panel = screen.getByTestId('period-progress-panel');
    expect(panel).toBeInTheDocument();

    // Panel should contain Hoy, Semana, Balance segments
    const panelWithin = within(panel);
    expect(panelWithin.getByText('Hoy')).toBeInTheDocument();
    expect(panelWithin.getByText('Semana')).toBeInTheDocument();
    expect(panelWithin.getByText('Balance')).toBeInTheDocument();
  });
});
