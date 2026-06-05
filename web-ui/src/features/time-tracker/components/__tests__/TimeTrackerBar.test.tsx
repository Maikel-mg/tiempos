import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeTrackerBar } from '../TimeTrackerBar';
import type { Proceso } from '../../types';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockRefresh = vi.fn();
const mockUseProcessCache = vi.fn();

vi.mock('../../hooks/useProcessCache', () => ({
  useProcessCache: () => mockUseProcessCache(),
}));

const timerMock = {
  timerState: null,
  isRunning: false,
  elapsed: 0,
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn(),
  cancel: vi.fn().mockResolvedValue(undefined),
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

function getTimeInputs(container: HTMLElement): HTMLInputElement[] {
  return Array.from(container.querySelectorAll('input[type="time"]'));
}

function setTimeValue(input: HTMLInputElement, value: string) {
  fireEvent.change(input, { target: { value } });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('TimeTrackerBar', () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    setupMockProcesses();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  it('renders all input fields in manual mode', () => {
    const { container } = render(<TimeTrackerBar onSubmit={mockOnSubmit} defaultMode="manual" />);

    expect(screen.getByPlaceholderText(/en qué estás trabajando/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('09:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /añadir/i })).toBeInTheDocument();
    expect(getTimeInputs(container)).toHaveLength(2);
  });

  it('disables AÑADIR button when required fields are empty', () => {
    render(<TimeTrackerBar onSubmit={mockOnSubmit} defaultMode="manual" />);

    const addBtn = screen.getByRole('button', { name: /añadir/i });
    expect(addBtn).toBeDisabled();
  });

  it('shows duration as 00:00:00 when no end time', () => {
    render(<TimeTrackerBar onSubmit={mockOnSubmit} defaultMode="manual" />);

    expect(screen.getByText('00:00:00')).toBeInTheDocument();
  });

  it('computes duration live when times change', () => {
    const { container } = render(<TimeTrackerBar onSubmit={mockOnSubmit} defaultMode="manual" />);

    const timeInputs = getTimeInputs(container);
    setTimeValue(timeInputs[1], '12:00');

    expect(screen.getByText('03:00:00')).toBeInTheDocument();
  });

  it('shows disabled button when end < start (negative duration)', () => {
    const { container } = render(<TimeTrackerBar onSubmit={mockOnSubmit} defaultMode="manual" />);

    const timeInputs = getTimeInputs(container);
    setTimeValue(timeInputs[1], '08:00');

    const addBtn = screen.getByRole('button', { name: /añadir/i });
    expect(addBtn).toBeDisabled();
  });

  it('calls onSubmit with correct data when form is valid', async () => {
    const user = userEvent.setup();
    const { container } = render(<TimeTrackerBar onSubmit={mockOnSubmit} defaultMode="manual" />);

    // Select a task
    const selectBtn = screen.getByRole('button', { name: /seleccionar proceso/i });
    await user.click(selectBtn);
    await user.click(await screen.findByText('Desarrollo Frontend'));

    // Set end time
    const timeInputs = getTimeInputs(container);
    setTimeValue(timeInputs[1], '17:00');

    // Submit
    const addBtn = screen.getByRole('button', { name: /añadir/i });
    expect(addBtn).toBeEnabled();
    await user.click(addBtn);

    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 101,
        taskName: 'Desarrollo Frontend',
        startTime: '09:00',
        endTime: '17:00',
      })
    );
  });

  it('clears description and times after successful submit', async () => {
    const user = userEvent.setup();
    const { container } = render(<TimeTrackerBar onSubmit={mockOnSubmit} defaultMode="manual" />);

    // Select a task
    const selectBtn = screen.getByRole('button', { name: /seleccionar proceso/i });
    await user.click(selectBtn);
    await user.click(await screen.findByText('Desarrollo Frontend'));

    // Type description
    const descInput = screen.getByPlaceholderText(/en qué estás trabajando/i);
    await user.type(descInput, 'Test description');

    // Set end time
    const timeInputs = getTimeInputs(container);
    setTimeValue(timeInputs[1], '10:00');

    // Submit
    const addBtn = screen.getByRole('button', { name: /añadir/i });
    await user.click(addBtn);

    // Description and end time should be cleared, start time should reset to 09:00
    expect(descInput).toHaveValue('');
    expect(timeInputs[1]).toHaveValue('');
    expect(timeInputs[0]).toHaveValue('09:00');
  });

  it('renders disabled state', () => {
    render(<TimeTrackerBar onSubmit={mockOnSubmit} defaultMode="manual" disabled />);

    expect(screen.getByPlaceholderText(/en qué estás trabajando/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /añadir/i })).toBeDisabled();
  });

  it('initializes with initialData in manual mode', () => {
    render(
      <TimeTrackerBar
        onSubmit={mockOnSubmit}
        defaultMode="manual"
        initialData={{
          taskId: 102,
          taskName: 'Desarrollo Backend',
          date: '2026-06-01',
          startTime: '10:00',
          endTime: '18:00',
          description: 'Existing work',
        }}
      />
    );

    expect(screen.getByPlaceholderText(/en qué estás trabajando/i)).toHaveValue('Existing work');
    expect(screen.getByDisplayValue('2026-06-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('18:00')).toBeInTheDocument();
    expect(screen.getByText('08:00:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /desarrollo backend/i })).toBeInTheDocument();
  });
});
