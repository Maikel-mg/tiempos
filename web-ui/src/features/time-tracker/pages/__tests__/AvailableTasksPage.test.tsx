import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AvailableTasksPage } from '../AvailableTasksPage';
import { useProcessCache } from '../../hooks/useProcessCache';
import { useTimeEntries } from '../../hooks/useTimeEntries';
import { deleteLocalTask, TaskHasEntriesError } from '../../services/localTasksService';
import type { Proceso, TimeEntry } from '../../types';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../hooks/useProcessCache');
vi.mock('../../hooks/useTimeEntries');
vi.mock('../../services/localTasksService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/localTasksService')>()),
  deleteLocalTask: vi.fn(),
  saveLocalTask: vi.fn(),
}));
vi.mock('@/features/process-management/mutations/useCreateProcess', () => ({
  useCreateProcess: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    data: null,
    error: null,
  }),
}));
vi.mock('@/components/SQLPreviewModal', () => ({
  SQLPreviewModal: ({ open, onOpenChange }: any) =>
    open ? <div data-testid="sql-preview-modal"><button onClick={() => onOpenChange(false)}>Close</button></div> : null,
}));
vi.mock('@/config/stores', () => ({
  wizardConfig: { get: () => ({ usuario: 'test', fase: '1', tipoHora: '11' }) },
  scheduleConfig: {
    get: () => ({
      defaultHours: { mon: 8.25, tue: 8.25, wed: 8.25, thu: 8.25, fri: 7, sat: 0, sun: 0 },
      exceptions: [],
    }),
  },
}));

// ── Test data ────────────────────────────────────────────────────────────────

const mockProcesses: Proceso[] = [
  {
    proceso: 101,
    nombre: 'Desarrollo Frontend',
    faseNombre: 'Fase Construccion',
    proyectoNombre: 'Proyecto Alpha',
    clienteNombre: 'Cliente Uno',
    departamentoId: 5,
    departamentoNombre: 'Tecnologia',
    disciplinaId: 1,
  },
  {
    proceso: 102,
    nombre: 'Desarrollo Backend',
    faseNombre: 'Fase Construccion',
    proyectoNombre: 'Proyecto Alpha',
    clienteNombre: 'Cliente Uno',
    departamentoId: 3,
    departamentoNombre: 'Desarrollo',
    disciplinaId: 2,
  },
  {
    proceso: 103,
    nombre: 'Diseno UX',
    faseNombre: 'Fase Diseno',
    proyectoNombre: 'Proyecto Beta',
    clienteNombre: 'Cliente Dos',
    departamentoId: 5,
    departamentoNombre: 'Tecnologia',
    disciplinaId: 1,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** `useTimeEntries` con las entradas dadas y la mutación simulada. */
const mockEntriesHook = (entries: TimeEntry[] = []) =>
  vi.mocked(useTimeEntries).mockReturnValue({
    entries,
    loading: false,
    updateEntry: mockUpdateEntry,
    deleteEntry: mockDeleteEntry,
  } as unknown as ReturnType<typeof useTimeEntries>);

const mockUpdateEntry = vi.fn().mockResolvedValue(null);
const mockDeleteEntry = vi.fn().mockResolvedValue(undefined);

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AvailableTasksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEntriesHook();
  });

  it('renders loading state', () => {
    vi.mocked(useProcessCache).mockReturnValue({
      processes: [],
      loading: true,
      error: null,
      refresh: vi.fn(),
      offline: false,
    });

    render(<AvailableTasksPage />);
    expect(screen.getByText('Cargando tareas...')).toBeDefined();
  });

  it('renders table with process data after loading', () => {
    vi.mocked(useProcessCache).mockReturnValue({
      processes: mockProcesses,
      loading: false,
      error: null,
      refresh: vi.fn(),
      offline: false,
    });

    render(<AvailableTasksPage />);

    // Default filter: dept 5 only
    expect(screen.getByText('Desarrollo Frontend')).toBeDefined();
    expect(screen.getByText('Diseno UX')).toBeDefined();
    // Dept 3 task is hidden by default
    expect(screen.queryByText('Desarrollo Backend')).toBeNull();
  });

  it('renders table headers', () => {
    vi.mocked(useProcessCache).mockReturnValue({
      processes: mockProcesses,
      loading: false,
      error: null,
      refresh: vi.fn(),
      offline: false,
    });

    render(<AvailableTasksPage />);

    expect(screen.getByText('Nombre')).toBeDefined();
    expect(screen.getByText('Fase')).toBeDefined();
    expect(screen.getByText('Proyecto')).toBeDefined();
    expect(screen.getByText('Cliente')).toBeDefined();
    expect(screen.getByText('Departamento')).toBeDefined();
    expect(screen.getByText('Disciplina')).toBeDefined();
    expect(screen.getByText('ID')).toBeDefined();
  });

  it('renders error state with retry button', () => {
    const mockRefresh = vi.fn();
    vi.mocked(useProcessCache).mockReturnValue({
      processes: [],
      loading: false,
      error: 'Error al cargar procesos',
      refresh: mockRefresh,
      offline: false,
    });

    render(<AvailableTasksPage />);
    expect(screen.getByText('Error al cargar procesos')).toBeDefined();
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeDefined();
  });

  it('renders empty state when no processes', () => {
    vi.mocked(useProcessCache).mockReturnValue({
      processes: [],
      loading: false,
      error: null,
      refresh: vi.fn(),
      offline: false,
    });

    render(<AvailableTasksPage />);
    expect(screen.getByText('No hay tareas disponibles')).toBeDefined();
  });

  it('calls refresh when retry button is clicked', async () => {
    const mockRefresh = vi.fn();
    vi.mocked(useProcessCache).mockReturnValue({
      processes: [],
      loading: false,
      error: 'Network error',
      refresh: mockRefresh,
      offline: false,
    });

    render(<AvailableTasksPage />);
    const retryButton = screen.getByRole('button', { name: /reintentar/i });
    retryButton.click();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('defaults to showing only tasks from department 5', () => {
    vi.mocked(useProcessCache).mockReturnValue({
      processes: mockProcesses,
      loading: false,
      error: null,
      refresh: vi.fn(),
      offline: false,
    });

    render(<AvailableTasksPage />);

    // Should show dept 5 tasks
    expect(screen.getByText('Desarrollo Frontend')).toBeDefined();
    expect(screen.getByText('Diseno UX')).toBeDefined();
    // Should NOT show dept 3 task
    expect(screen.queryByText('Desarrollo Backend')).toBeNull();
  });

  it('shows all tasks when switch is toggled to "Todos"', async () => {
    const user = userEvent.setup();
    vi.mocked(useProcessCache).mockReturnValue({
      processes: mockProcesses,
      loading: false,
      error: null,
      refresh: vi.fn(),
      offline: false,
    });

    render(<AvailableTasksPage />);

    // Initially only dept 5
    expect(screen.queryByText('Desarrollo Backend')).toBeNull();

    // Toggle switch to "Todos"
    const switchEl = screen.getByRole('switch');
    await user.click(switchEl);

    // Now all tasks should be visible
    expect(screen.getByText('Desarrollo Frontend')).toBeDefined();
    expect(screen.getByText('Desarrollo Backend')).toBeDefined();
    expect(screen.getByText('Diseno UX')).toBeDefined();
  });

  it('switches back to department 5 when toggled again', async () => {
    const user = userEvent.setup();
    vi.mocked(useProcessCache).mockReturnValue({
      processes: mockProcesses,
      loading: false,
      error: null,
      refresh: vi.fn(),
      offline: false,
    });

    render(<AvailableTasksPage />);

    const switchEl = screen.getByRole('switch');

    // Toggle to "Todos"
    await user.click(switchEl);
    expect(screen.getByText('Desarrollo Backend')).toBeDefined();

    // Toggle back to "Mi departamento"
    await user.click(switchEl);
    expect(screen.queryByText('Desarrollo Backend')).toBeNull();
  });

  it('renders "Crear tarea" button', () => {
    vi.mocked(useProcessCache).mockReturnValue({
      processes: mockProcesses,
      loading: false,
      error: null,
      refresh: vi.fn(),
      offline: false,
    });

    render(<AvailableTasksPage />);
    expect(screen.getByRole('button', { name: /crear tarea/i })).toBeDefined();
  });

  it('opens SQLPreviewModal when "Crear tarea" is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useProcessCache).mockReturnValue({
      processes: mockProcesses,
      loading: false,
      error: null,
      refresh: vi.fn(),
      offline: false,
    });

    render(<AvailableTasksPage />);

    expect(screen.queryByTestId('sql-preview-modal')).toBeNull();

    const createBtn = screen.getByRole('button', { name: /crear tarea/i });
    await user.click(createBtn);

    expect(screen.getByTestId('sql-preview-modal')).toBeDefined();
  });

  describe('Columna Horas y visor de Registros', () => {
    const today = new Date();
    const monthDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-10`;

    const makeEntry = (over: Partial<TimeEntry>): TimeEntry => ({
      id: 'e1',
      taskId: 101,
      taskName: 'Desarrollo Frontend',
      proceso: mockProcesses[0],
      date: monthDate,
      startTime: '09:00',
      endTime: '10:30',
      duration: 5400,
      createdAt: '',
      updatedAt: '',
      synced: false,
      ...over,
    });

    const withProcesses = () =>
      vi.mocked(useProcessCache).mockReturnValue({
        processes: mockProcesses,
        loading: false,
        error: null,
        refresh: vi.fn(),
        offline: false,
      });

    it('muestra el encabezado Horas', () => {
      withProcesses();
      render(<AvailableTasksPage />);
      expect(screen.getByText('Horas')).toBeDefined();
    });

    it('muestra HH:MM y el porcentaje sobre el total del mes', () => {
      withProcesses();
      mockEntriesHook([
        makeEntry({ id: 'e1', duration: 5400 }),
        makeEntry({ id: 'e2', taskId: 103, duration: 1800, proceso: mockProcesses[2] }),
      ]);

      render(<AvailableTasksPage />);
      expect(screen.getByText('1:30')).toBeDefined();
      expect(screen.getByText('(75.0%)')).toBeDefined();
      expect(screen.getByText('0:30')).toBeDefined();
      expect(screen.getByText('(25.0%)')).toBeDefined();
    });

    it('muestra — cuando la tarea no tiene Registros este mes', () => {
      withProcesses();
      mockEntriesHook([makeEntry({ date: '2020-01-10' })]);

      render(<AvailableTasksPage />);
      expect(screen.getAllByTitle('Ver registros de la tarea')).toHaveLength(2);
      expect(screen.queryByText('1:30')).toBeNull();
    });

    it('abre el desglose al hacer click en las horas y permite ver todo el historial', async () => {
      const user = userEvent.setup();
      withProcesses();
      mockEntriesHook([
        makeEntry({}),
        makeEntry({ id: 'e2', date: '2020-01-10', duration: 3600 }),
      ]);

      render(<AvailableTasksPage />);
      await user.click(screen.getByText('1:30'));

      const dialog = screen.getByRole('dialog');
      expect(within(dialog).getByText(/Registros de «Desarrollo Frontend»/)).toBeDefined();
      expect(within(dialog).getByText('1 registro(s)')).toBeDefined();
      expect(within(dialog).getByText('1h 30m')).toBeDefined();

      await user.click(within(dialog).getByRole('button', { name: 'Todo el historial' }));
      expect(within(dialog).getByText('2 registro(s)')).toBeDefined();
      expect(within(dialog).getByText('10/01/2020')).toBeDefined();
    });

    it('abre el desglose completo cuando el borrado se bloquea por Registros', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.mocked(deleteLocalTask).mockRejectedValue(new TaskHasEntriesError(1));
      vi.mocked(useProcessCache).mockReturnValue({
        processes: [{ ...mockProcesses[0], pendiente: true }],
        loading: false,
        error: null,
        refresh: vi.fn(),
        offline: false,
      });
      mockEntriesHook([makeEntry({ date: '2020-01-10' })]);

      render(<AvailableTasksPage />);
      await user.click(screen.getByRole('button', { name: /Eliminar tarea local/ }));

      const dialog = await screen.findByRole('dialog');
      // Abierto en "Todo el historial": el Registro que bloquea está a la vista.
      expect(within(dialog).getByText('10/01/2020')).toBeDefined();
    });

    it('permite seleccionar un Registro sin sincronizar y cambiarle la tarea', async () => {
      const user = userEvent.setup();
      withProcesses();
      mockEntriesHook([makeEntry({})]);

      render(<AvailableTasksPage />);
      await user.click(screen.getByText('1:30'));

      const drawer = screen.getByRole('dialog');
      const firstRow = within(drawer).getAllByRole('row')[1];
      await user.click(within(firstRow).getAllByRole('button')[0]);

      const changeButton = within(drawer).getByRole('button', { name: /Cambiar tarea/ });
      expect(changeButton).toHaveProperty('disabled', false);
      await user.click(changeButton);

      expect(
        await screen.findByText('Cambiar tarea de 1 registro')
      ).toBeDefined();
    });
  });

  describe('Auto-focus on mount', () => {
    it('auto-focuses first table row on mount when data is loaded', () => {
      vi.mocked(useProcessCache).mockReturnValue({
        processes: mockProcesses,
        loading: false,
        error: null,
        refresh: vi.fn(),
        offline: false,
      });

      render(<AvailableTasksPage />);

      const rows = screen.getAllByRole('row');
      // rows[0] is header, rows[1] is first data row
      expect(rows[1]?.getAttribute('data-state')).toBe('active');
    });

    it('does not auto-focus when no processes are loaded', () => {
      vi.mocked(useProcessCache).mockReturnValue({
        processes: [],
        loading: false,
        error: null,
        refresh: vi.fn(),
        offline: false,
      });

      render(<AvailableTasksPage />);

      // No table rendered — empty state shown
      const rows = screen.queryAllByRole('row');
      expect(rows).toHaveLength(0);
    });

    it('does not auto-focus during loading', () => {
      vi.mocked(useProcessCache).mockReturnValue({
        processes: [],
        loading: true,
        error: null,
        refresh: vi.fn(),
        offline: false,
      });

      render(<AvailableTasksPage />);
      expect(screen.getByText('Cargando tareas...')).toBeDefined();
    });
  });

  describe('Keyboard navigation', () => {
    it('ArrowDown moves sequentially through rows', async () => {
      const user = userEvent.setup();
      vi.mocked(useProcessCache).mockReturnValue({
        processes: mockProcesses,
        loading: false,
        error: null,
        refresh: vi.fn(),
        offline: false,
      });

      render(<AvailableTasksPage />);

      // Auto-focus already active on row 0
      const rows = screen.getAllByRole('row');
      expect(rows[1]?.getAttribute('data-state')).toBe('active');

      // ArrowDown moves to second data row
      await user.keyboard('{ArrowDown}');
      expect(rows[2]?.getAttribute('data-state')).toBe('active');

      // Move back up
      await user.keyboard('{ArrowUp}');
      expect(rows[1]?.getAttribute('data-state')).toBe('active');
    });

    it('Arrow keys are ignored when filter input is focused', async () => {
      const user = userEvent.setup();
      vi.mocked(useProcessCache).mockReturnValue({
        processes: mockProcesses,
        loading: false,
        error: null,
        refresh: vi.fn(),
        offline: false,
      });

      render(<AvailableTasksPage />);

      // Auto-focus already on row 0
      const rows = screen.getAllByRole('row');
      expect(rows[1]?.getAttribute('data-state')).toBe('active');

      // Focus an input
      const inputs = document.querySelectorAll('input');
      if (inputs.length > 0) {
        (inputs[0] as HTMLInputElement).focus();
      }

      // ArrowDown should NOT move the active row
      await user.keyboard('{ArrowDown}');
      expect(rows[1]?.getAttribute('data-state')).toBe('active');
    });

    it('Home and End move to first and last rows', async () => {
      const user = userEvent.setup();
      vi.mocked(useProcessCache).mockReturnValue({
        processes: mockProcesses,
        loading: false,
        error: null,
        refresh: vi.fn(),
        offline: false,
      });

      render(<AvailableTasksPage />);

      // Auto-focus already on row 0
      const rows = screen.getAllByRole('row');
      expect(rows[1]?.getAttribute('data-state')).toBe('active');

      // End should go to last data row
      await user.keyboard('{End}');
      expect(rows[2]?.getAttribute('data-state')).toBe('active');

      // Home should go to first data row
      await user.keyboard('{Home}');
      expect(rows[1]?.getAttribute('data-state')).toBe('active');
    });

    it('ArrowDown moves active row highlight to first row', async () => {
      vi.mocked(useProcessCache).mockReturnValue({
        processes: mockProcesses,
        loading: false,
        error: null,
        refresh: vi.fn(),
        offline: false,
      });

      render(<AvailableTasksPage />);

      // Auto-focus already on first data row
      const rows = screen.getAllByRole('row');
      expect(rows[1]?.getAttribute('data-state')).toBe('active');
    });

    it('Enter on active row is a no-op (no onRowClick)', async () => {
      const user = userEvent.setup();
      vi.mocked(useProcessCache).mockReturnValue({
        processes: mockProcesses,
        loading: false,
        error: null,
        refresh: vi.fn(),
        offline: false,
      });

      render(<AvailableTasksPage />);

      // Auto-focus already on row 0
      const rows = screen.getAllByRole('row');
      expect(rows[1]?.getAttribute('data-state')).toBe('active');

      // Press Enter — should not throw or navigate
      await user.keyboard('{Enter}');

      // Row should still be active (no-op)
      expect(rows[1]?.getAttribute('data-state')).toBe('active');
    });

    it('Escape clears active row', async () => {
      const user = userEvent.setup();
      vi.mocked(useProcessCache).mockReturnValue({
        processes: mockProcesses,
        loading: false,
        error: null,
        refresh: vi.fn(),
        offline: false,
      });

      render(<AvailableTasksPage />);

      // Auto-focus already on row 0
      const rows = screen.getAllByRole('row');
      expect(rows[1]?.getAttribute('data-state')).toBe('active');

      await user.keyboard('{Escape}');

      // No row should have active state
      const activeRows = rows.filter(r => r.getAttribute('data-state') === 'active');
      expect(activeRows).toHaveLength(0);
    });

    it('PageDown and PageUp are handled without crash', async () => {
      const user = userEvent.setup();
      vi.mocked(useProcessCache).mockReturnValue({
        processes: mockProcesses,
        loading: false,
        error: null,
        refresh: vi.fn(),
        offline: false,
      });

      render(<AvailableTasksPage />);

      // Auto-focus already on row 0
      const rows = screen.getAllByRole('row');
      expect(rows[1]?.getAttribute('data-state')).toBe('active');

      // PageDown should not crash
      await user.keyboard('{PageDown}');
      // PageUp should not crash
      await user.keyboard('{PageUp}');
    });
  });
});
