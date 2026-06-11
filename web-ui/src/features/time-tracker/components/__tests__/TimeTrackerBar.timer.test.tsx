import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeTrackerBar } from '../TimeTrackerBar';
import type { Proceso } from '../../types';
import type { TimerState } from '../../types';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockRefresh = vi.fn();
const mockUseProcessCache = vi.fn();

vi.mock('../../hooks/useProcessCache', () => ({
  useProcessCache: () => mockUseProcessCache(),
}));

// Timer mock — controllable state per test
const timerMock = {
  timerState: null as TimerState | null,
  isRunning: false,
  elapsed: 0,
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn(),
  cancel: vi.fn().mockResolvedValue(undefined),
  updateStartTime: vi.fn().mockResolvedValue(undefined),
  updateDescription: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../../hooks/useTimer', () => ({
  useTimer: () => timerMock,
}));

const SEED_PROCESSES: Proceso[] = [
  { proceso: 101, nombre: 'Desarrollo Frontend', faseNombre: 'Fase Construcción' },
  { proceso: 102, nombre: 'Desarrollo Backend', faseNombre: 'Fase Construcción' },
];

function setupMockProcesses(processes: Proceso[] = SEED_PROCESSES) {
  mockUseProcessCache.mockReturnValue({
    processes,
    loading: false,
    error: null,
    refresh: mockRefresh,
  });
}

function resetTimerMock() {
  timerMock.timerState = null;
  timerMock.isRunning = false;
  timerMock.elapsed = 0;
  timerMock.start.mockClear();
  timerMock.stop.mockReset();
  timerMock.cancel.mockClear();
  timerMock.updateStartTime.mockClear();
  timerMock.updateDescription.mockClear();
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('TimeTrackerBar — Timer Mode', () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

  /** Helper: renders TimeTrackerBar with the mock timer prop */
  function renderBar(props: Record<string, unknown> = {}) {
    return render(<TimeTrackerBar onSubmit={mockOnSubmit} timer={timerMock} {...props} />);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setupMockProcesses();
    resetTimerMock();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  it('renders clock display and INICIO button by default', () => {
    renderBar();

    expect(screen.getByText('00:00:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /inicio/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /detener/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /añadir/i })).not.toBeInTheDocument();
  });

  it('does not render date/time fields in timer mode', () => {
    renderBar();

    expect(screen.queryByDisplayValue('09:00')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('2026-06-05')).not.toBeInTheDocument();
  });

  it('disables INICIO when no task is selected', () => {
    renderBar();

    const inicioBtn = screen.getByRole('button', { name: /inicio/i });
    expect(inicioBtn).toBeDisabled();
    expect(inicioBtn).toHaveAttribute('title', 'Seleccioná una tarea primero');
  });

  it('enables INICIO after selecting a task', async () => {
    const user = userEvent.setup();
    renderBar();

    const selectBtn = screen.getByRole('button', { name: /seleccionar proceso/i });
    await user.click(selectBtn);
    await user.click(await screen.findByText('Desarrollo Frontend'));

    const inicioBtn = screen.getByRole('button', { name: /inicio/i });
    expect(inicioBtn).toBeEnabled();
  });

  it('calls useTimer.start when INICIO is clicked', async () => {
    const user = userEvent.setup();
    renderBar();

    // Select task first
    const selectBtn = screen.getByRole('button', { name: /seleccionar proceso/i });
    await user.click(selectBtn);
    await user.click(await screen.findByText('Desarrollo Frontend'));

    // Click INICIO
    await user.click(screen.getByRole('button', { name: /inicio/i }));

    expect(timerMock.start).toHaveBeenCalledWith(101, 'Desarrollo Frontend');
  });

  it('shows DETENER button when timer is running', () => {
    timerMock.isRunning = true;
    timerMock.elapsed = 65;
    timerMock.timerState = { isRunning: true, taskId: 101, taskName: 'Desarrollo Frontend', startTime: new Date().toISOString(), elapsed: 65 };

    renderBar();

    expect(screen.getByRole('button', { name: /detener/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /inicio/i })).not.toBeInTheDocument();
  });

  it('shows elapsed time on clock when timer is running', () => {
    timerMock.elapsed = 3661; // 01:01:01
    timerMock.isRunning = true;
    timerMock.timerState = { isRunning: true, taskId: 101, taskName: 'Desarrollo Frontend', startTime: new Date().toISOString(), elapsed: 3661 };

    renderBar();

    expect(screen.getByText('01:01:01')).toBeInTheDocument();
  });

  it('calls useTimer.stop when DETENER is clicked', async () => {
    const user = userEvent.setup();
    const stopResult = {
      start: new Date('2026-06-05T10:00:00'),
      end: new Date('2026-06-05T11:30:00'),
      taskId: 101,
      taskName: 'Desarrollo Frontend',
    };
    timerMock.stop.mockResolvedValue(stopResult);

    timerMock.isRunning = true;
    timerMock.timerState = { isRunning: true, taskId: 101, taskName: 'Desarrollo Frontend', startTime: stopResult.start.toISOString(), elapsed: 5400 };

    renderBar();

    await user.click(screen.getByRole('button', { name: /detener/i }));

    expect(timerMock.stop).toHaveBeenCalledWith({ persist: false });
  });

  it('creates entry directly when no midnight crossing', async () => {
    const user = userEvent.setup();
    const stopResult = {
      start: new Date('2026-06-05T10:00:00'),
      end: new Date('2026-06-05T11:30:00'),
      taskId: 101,
      taskName: 'Desarrollo Frontend',
    };
    timerMock.stop.mockResolvedValue(stopResult);

    timerMock.isRunning = true;
    timerMock.timerState = { isRunning: true, taskId: 101, taskName: 'Desarrollo Frontend', startTime: stopResult.start.toISOString(), elapsed: 5400 };

    renderBar();

    await user.click(screen.getByRole('button', { name: /detener/i }));

    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 101,
        taskName: 'Desarrollo Frontend',
        date: '2026-06-05',
        startTime: '10:00',
        endTime: '11:30',
      })
    );
  });

  it('shows MidnightSplitModal when timer crosses midnight', async () => {
    const user = userEvent.setup();
    const stopResult = {
      start: new Date('2026-06-04T23:00:00'),
      end: new Date('2026-06-05T01:00:00'),
      taskId: 101,
      taskName: 'Desarrollo Frontend',
    };
    timerMock.stop.mockResolvedValue(stopResult);

    timerMock.isRunning = true;
    timerMock.timerState = { isRunning: true, taskId: 101, taskName: 'Desarrollo Frontend', startTime: stopResult.start.toISOString(), elapsed: 7200 };

    renderBar();

    await user.click(screen.getByRole('button', { name: /detener/i }));

    // Modal should appear
    expect(screen.getByText('Cruza la medianoche')).toBeInTheDocument();
    expect(screen.getByText(/Dividir en 2 TimeEntries/)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('creates split entries when user confirms split', async () => {
    const user = userEvent.setup();
    const stopResult = {
      start: new Date('2026-06-04T23:00:00'),
      end: new Date('2026-06-05T01:00:00'),
      taskId: 101,
      taskName: 'Desarrollo Frontend',
    };
    timerMock.stop.mockResolvedValue(stopResult);

    timerMock.isRunning = true;
    timerMock.timerState = { isRunning: true, taskId: 101, taskName: 'Desarrollo Frontend', startTime: stopResult.start.toISOString(), elapsed: 7200 };

    renderBar();

    await user.click(screen.getByRole('button', { name: /detener/i }));

    // Confirm split
    const splitBtn = screen.getByRole('button', { name: /dividir en 2/i });
    await user.click(splitBtn);

    // Should create 2 entries (one per day)
    expect(mockOnSubmit).toHaveBeenCalledTimes(2);
  });

  it('creates single entry when user keeps as one', async () => {
    const user = userEvent.setup();
    const stopResult = {
      start: new Date('2026-06-04T23:00:00'),
      end: new Date('2026-06-05T01:00:00'),
      taskId: 101,
      taskName: 'Desarrollo Frontend',
    };
    timerMock.stop.mockResolvedValue(stopResult);

    timerMock.isRunning = true;
    timerMock.timerState = { isRunning: true, taskId: 101, taskName: 'Desarrollo Frontend', startTime: stopResult.start.toISOString(), elapsed: 7200 };

    renderBar();

    await user.click(screen.getByRole('button', { name: /detener/i }));

    // Keep single
    await user.click(screen.getByRole('button', { name: /dejar como uno solo/i }));

    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 101,
        taskName: 'Desarrollo Frontend',
      })
    );
  });

  it('calls useTimer.cancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    timerMock.isRunning = true;
    timerMock.timerState = { isRunning: true, taskId: 101, taskName: 'Desarrollo Frontend', startTime: new Date().toISOString(), elapsed: 300 };

    renderBar();

    await user.click(screen.getByTitle('Cancelar'));

    expect(timerMock.cancel).toHaveBeenCalled();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('disables inputs when timer is running', () => {
    timerMock.isRunning = true;
    timerMock.timerState = { isRunning: true, taskId: 101, taskName: 'Desarrollo Frontend', startTime: new Date().toISOString(), elapsed: 60 };

    renderBar();

    expect(screen.getByPlaceholderText(/en qué estás trabajando/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /desarrollo frontend/i })).toBeDisabled();
  });

  it('includes description in entry when timer stops', async () => {
    const user = userEvent.setup();
    const stopResult = {
      start: new Date('2026-06-05T10:00:00'),
      end: new Date('2026-06-05T11:30:00'),
      taskId: 101,
      taskName: 'Desarrollo Frontend',
    };
    timerMock.stop.mockResolvedValue(stopResult);

    // Start with timer NOT running — so description input is editable
    const { rerender } = renderBar();

    // Type description while timer is idle
    const descInput = screen.getByPlaceholderText(/en qué estás trabajando/i);
    await user.type(descInput, 'Working on feature X');

    // Now simulate timer starting — update mock and re-render
    timerMock.isRunning = true;
    timerMock.timerState = { isRunning: true, taskId: 101, taskName: 'Desarrollo Frontend', startTime: stopResult.start.toISOString(), elapsed: 5400 };
    rerender(<TimeTrackerBar onSubmit={mockOnSubmit} timer={timerMock} />);

    // Stop timer
    await user.click(screen.getByRole('button', { name: /detener/i }));

    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Working on feature X',
      })
    );
  });

  it('switches to manual mode when toggle is clicked', async () => {
    const user = userEvent.setup();
    renderBar();

    // Switch to manual
    await user.click(screen.getByRole('button', { name: /manual/i }));

    expect(screen.getByRole('button', { name: /añadir/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /inicio/i })).not.toBeInTheDocument();
  });

  it('switches to timer mode when toggle is clicked', async () => {
    const user = userEvent.setup();
    renderBar({ defaultMode: 'manual' });

    // Start in manual mode
    expect(screen.getByRole('button', { name: /añadir/i })).toBeInTheDocument();

    // Switch to timer
    await user.click(screen.getByRole('button', { name: /timer/i }));

    expect(screen.getByRole('button', { name: /inicio/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /añadir/i })).not.toBeInTheDocument();
  });
});
