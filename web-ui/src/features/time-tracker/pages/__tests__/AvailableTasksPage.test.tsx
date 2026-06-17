import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AvailableTasksPage } from '../AvailableTasksPage';
import { useProcessCache } from '../../hooks/useProcessCache';
import type { Proceso } from '../../types';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../hooks/useProcessCache');
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

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AvailableTasksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    vi.mocked(useProcessCache).mockReturnValue({
      processes: [],
      loading: true,
      error: null,
      refresh: vi.fn(),
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
    });

    render(<AvailableTasksPage />);

    expect(screen.queryByTestId('sql-preview-modal')).toBeNull();

    const createBtn = screen.getByRole('button', { name: /crear tarea/i });
    await user.click(createBtn);

    expect(screen.getByTestId('sql-preview-modal')).toBeDefined();
  });

  describe('Keyboard navigation', () => {
    it('ArrowDown moves sequentially through rows', async () => {
      const user = userEvent.setup();
      vi.mocked(useProcessCache).mockReturnValue({
        processes: mockProcesses,
        loading: false,
        error: null,
        refresh: vi.fn(),
      });

      render(<AvailableTasksPage />);

      const table = screen.getByRole('table');
      table.focus();

      const rows = screen.getAllByRole('row');

      // Move to first data row
      await user.keyboard('{ArrowDown}');
      expect(rows[1]?.getAttribute('data-state')).toBe('active');

      // Move to second data row
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
      });

      render(<AvailableTasksPage />);

      // Focus the table first
      const table = screen.getByRole('table');
      table.focus();

      // Move to a row
      await user.keyboard('{ArrowDown}');
      const rows = screen.getAllByRole('row');
      expect(rows[1]?.getAttribute('data-state')).toBe('active');

      // Now focus an input (the filter switch label or any input)
      const inputs = document.querySelectorAll('input');
      if (inputs.length > 0) {
        (inputs[0] as HTMLInputElement).focus();
      }

      // ArrowDown should NOT move the active row
      await user.keyboard('{ArrowDown}');
      // Row 1 should still be active (unchanged)
      expect(rows[1]?.getAttribute('data-state')).toBe('active');
    });

    it('Home and End move to first and last rows', async () => {
      const user = userEvent.setup();
      vi.mocked(useProcessCache).mockReturnValue({
        processes: mockProcesses,
        loading: false,
        error: null,
        refresh: vi.fn(),
      });

      render(<AvailableTasksPage />);

      const table = screen.getByRole('table');
      table.focus();

      const rows = screen.getAllByRole('row');

      // End should go to last data row
      await user.keyboard('{End}');
      expect(rows[2]?.getAttribute('data-state')).toBe('active');

      // Home should go to first data row
      await user.keyboard('{Home}');
      expect(rows[1]?.getAttribute('data-state')).toBe('active');
    });

    it(' ArrowDown moves active row highlight to first row', async () => {
      const user = userEvent.setup();
      vi.mocked(useProcessCache).mockReturnValue({
        processes: mockProcesses,
        loading: false,
        error: null,
        refresh: vi.fn(),
      });

      render(<AvailableTasksPage />);

      // Focus the table to activate keyboard nav
      const table = screen.getByRole('table');
      table.focus();

      await user.keyboard('{ArrowDown}');

      // First data row should have data-state="active"
      const rows = screen.getAllByRole('row');
      // rows[0] is header, rows[1] is first data row
      expect(rows[1]?.getAttribute('data-state')).toBe('active');
    });

    it('Enter on active row is a no-op (no onRowClick)', async () => {
      const user = userEvent.setup();
      vi.mocked(useProcessCache).mockReturnValue({
        processes: mockProcesses,
        loading: false,
        error: null,
        refresh: vi.fn(),
      });

      render(<AvailableTasksPage />);

      const table = screen.getByRole('table');
      table.focus();

      // Move to first row
      await user.keyboard('{ArrowDown}');
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
      });

      render(<AvailableTasksPage />);

      const table = screen.getByRole('table');
      table.focus();

      await user.keyboard('{ArrowDown}');
      const rows = screen.getAllByRole('row');
      expect(rows[1]?.getAttribute('data-state')).toBe('active');

      await user.keyboard('{Escape}');

      // No row should have active state
      const activeRows = rows.filter(r => r.getAttribute('data-state') === 'active');
      expect(activeRows).toHaveLength(0);
    });
  });
});
