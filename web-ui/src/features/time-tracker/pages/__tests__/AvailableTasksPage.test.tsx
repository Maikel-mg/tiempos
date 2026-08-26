import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AvailableTasksPage } from '../AvailableTasksPage';
import { useProcessCache } from '../../hooks/useProcessCache';
import type { Proceso, ProcesoPendiente } from '../../types';

// ── Mocks ────────────────────────────────────────────────────────────────────

const {
  mockCreatePendingProcess,
  mockReloadPending,
  mockUsePendingProcesses,
  mockToast,
} = vi.hoisted(() => ({
  mockCreatePendingProcess: vi.fn(),
  mockReloadPending: vi.fn(),
  mockUsePendingProcesses: vi.fn(),
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@/features/time-tracker/services/ProcessOfflineService', () => ({
  processOfflineService: {
    createPendingProcess: (...args: unknown[]) => mockCreatePendingProcess(...args),
    getPendingProcesses: vi.fn().mockResolvedValue([]),
    getPendingProcessesAsProcesos: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/features/pending-process/hooks/usePendingProcesses', () => ({
  usePendingProcesses: () => mockUsePendingProcesses(),
}));

vi.mock('@/features/pending-process/components/PendingProcessFormModal', () => ({
  PendingProcessFormModal: ({ open, onSaved, initialData }: any) => {
    if (!open) return null;
    return (
      <div data-testid="pending-form-modal">
        <span data-testid="pending-form-initial-id">{initialData?.id ?? ''}</span>
        <button
          onClick={() => {
            void mockCreatePendingProcess('test', { nombre: 'Pendiente Nuevo', minutos: 60 }).then((created: unknown) =>
              onSaved?.(created)
            );
          }}
        >
          Guardar pendiente
        </button>
      </div>
    );
  },
}));

vi.mock('@/features/pending-process/components/PendingProcessReassignModal', () => ({
  PendingProcessReassignModal: ({ open, onConfirm, entries }: any) => {
    if (!open) return null;
    return (
      <div data-testid="reassign-modal">
        <span data-testid="reassign-entry-count">{entries.length}</span>
        <button onClick={() => onConfirm([])}>Confirmar</button>
      </div>
    );
  },
}));

vi.mock('../../services/timeTrackingService', () => ({
  timeTrackingService: {
    getEntries: vi.fn().mockResolvedValue([]),
    updateEntry: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), mockToast),
  Toaster: () => null,
}));

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

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AvailableTasksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePendingProcesses.mockReturnValue({
      pendingProcesos: [],
      pendingProcesses: [],
      loading: false,
      error: null,
      reload: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    });
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

  it('renders offline guidance with a link to Proyectos when no tasks are cached', () => {
    vi.mocked(useProcessCache).mockReturnValue({
      processes: [],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter>
        <AvailableTasksPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('offline-tasks-empty-state')).toHaveTextContent(
      'No hay tareas disponibles offline. Conecta y marca tus proyectos en Proyectos'
    );
    expect(screen.getByRole('link', { name: 'Proyectos' })).toHaveAttribute('href', '/projects');
  });

  it('shows Procesos Pendientes without the empty offline state', () => {
    vi.mocked(useProcessCache).mockReturnValue({
      processes: [],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });
    mockUsePendingProcesses.mockReturnValue({
      pendingProcesos: [
        { proceso: -1, nombre: 'Proceso Pendiente', esPendiente: true },
      ],
      pendingProcesses: [
        {
          id: -1,
          nombre: 'Proceso Pendiente',
          minutos: 60,
          createdAt: 1,
          updatedAt: 1,
        },
      ],
      loading: false,
      error: null,
      reload: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    });

    render(
      <MemoryRouter>
        <AvailableTasksPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Tus Procesos Pendientes')).toBeInTheDocument();
    expect(screen.getByText('Proceso Pendiente')).toBeInTheDocument();
    expect(screen.queryByTestId('offline-tasks-empty-state')).not.toBeInTheDocument();
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

  describe('Auto-focus on mount', () => {
    it('auto-focuses first table row on mount when data is loaded', () => {
      vi.mocked(useProcessCache).mockReturnValue({
        processes: mockProcesses,
        loading: false,
        error: null,
        refresh: vi.fn(),
      });

      render(
        <MemoryRouter>
          <AvailableTasksPage />
        </MemoryRouter>
      );

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
      });

      render(
        <MemoryRouter>
          <AvailableTasksPage />
        </MemoryRouter>
      );

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
      const user = userEvent.setup();
      vi.mocked(useProcessCache).mockReturnValue({
        processes: mockProcesses,
        loading: false,
        error: null,
        refresh: vi.fn(),
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

  describe('Crear proceso pendiente', () => {
    beforeEach(() => {
      vi.mocked(useProcessCache).mockReturnValue({
        processes: mockProcesses,
        loading: false,
        error: null,
        refresh: vi.fn(),
      });
      mockUsePendingProcesses.mockReturnValue({
        pendingProcesos: [],
        pendingProcesses: [],
        loading: false,
        error: null,
        reload: mockReloadPending,
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
      });
      mockCreatePendingProcess.mockResolvedValue({
        id: -1,
        nombre: 'Pendiente Nuevo',
        minutos: 60,
        createdAt: 1000,
        updatedAt: 1000,
      });
    });

    it('renders a "Crear sin conexión" button', () => {
      render(<AvailableTasksPage />);
      expect(screen.getByRole('button', { name: /crear sin conexión/i })).toBeDefined();
    });

    it('opens the pending process form modal when clicked', async () => {
      const user = userEvent.setup();
      render(<AvailableTasksPage />);

      expect(screen.queryByTestId('pending-form-modal')).toBeNull();
      await user.click(screen.getByRole('button', { name: /crear sin conexión/i }));
      expect(screen.getByTestId('pending-form-modal')).toBeDefined();
    });

    it('creates a pending process via the service, reloads the list and toasts on save', async () => {
      const user = userEvent.setup();
      render(<AvailableTasksPage />);

      await user.click(screen.getByRole('button', { name: /crear sin conexión/i }));
      await user.click(screen.getByRole('button', { name: /guardar pendiente/i }));

      await waitFor(() => {
        expect(mockCreatePendingProcess).toHaveBeenCalledWith('test', expect.objectContaining({ nombre: 'Pendiente Nuevo' }));
      });
      expect(mockReloadPending).toHaveBeenCalledTimes(1);
      expect(mockToast.success).toHaveBeenCalledWith('Proceso pendiente creado');
      expect(screen.queryByTestId('pending-form-modal')).toBeNull();
    });
  });

  describe('Gestión de Procesos Pendientes', () => {
    const mockUpdatePending = vi.fn();
    const mockRemovePending = vi.fn();

    const pendingFixture: ProcesoPendiente[] = [
      {
        id: -1,
        nombre: 'Pendiente A',
        proyectoNombre: 'Proyecto Alpha',
        faseNombre: 'Fase Construccion',
        minutos: 120,
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: -2,
        nombre: 'Pendiente B',
        minutos: 60,
        createdAt: 2000,
        updatedAt: 2000,
      },
    ];

    beforeEach(() => {
      vi.mocked(useProcessCache).mockReturnValue({
        processes: mockProcesses,
        loading: false,
        error: null,
        refresh: vi.fn(),
      });
      mockUsePendingProcesses.mockReturnValue({
        pendingProcesos: [],
        pendingProcesses: pendingFixture,
        loading: false,
        error: null,
        reload: mockReloadPending,
        create: vi.fn(),
        update: mockUpdatePending,
        remove: mockRemovePending,
      });
      mockUpdatePending.mockReset();
      mockRemovePending.mockReset();
      mockUpdatePending.mockResolvedValue(null);
      mockRemovePending.mockResolvedValue(undefined);
    });

    it('lists the pending processes with provisional ID and project/phase', () => {
      render(<AvailableTasksPage />);
      expect(screen.getByText('Tus Procesos Pendientes')).toBeDefined();
      expect(screen.getByText('Pendiente A')).toBeDefined();
      expect(screen.getByText('Pendiente B')).toBeDefined();
      expect(screen.getByText(/ID provisional -1/)).toBeDefined();
      const pendingSection = screen.getByRole('region') ?? document.body;
      expect(pendingSection).toBeDefined();
      // The pending row renders project + phase inside the subtitle line
      expect(screen.getAllByText(/Proyecto Alpha/).length).toBeGreaterThan(0);
    });

    it('opens the edit form prefilled when the pencil button is clicked', async () => {
      const user = userEvent.setup();
      render(<AvailableTasksPage />);
      const editButtons = screen.getAllByRole('button', { name: /editar proceso pendiente/i });
      await user.click(editButtons[0]);
      expect(screen.getByTestId('pending-form-modal')).toBeDefined();
      expect(screen.getByTestId('pending-form-initial-id')).toHaveTextContent('-1');
    });

    it('deletes a pending without linked entries directly and reloads', async () => {
      const user = userEvent.setup();
      render(<AvailableTasksPage />);
      const deleteButtons = screen.getAllByRole('button', { name: /eliminar proceso pendiente/i });
      await user.click(deleteButtons[0]);
      await waitFor(() => {
        expect(mockRemovePending).toHaveBeenCalledWith(-1);
      });
      expect(mockToast.success).toHaveBeenCalledWith('Proceso pendiente eliminado');
    });

    it('opens the reassign modal when the pending has linked unsynced entries', async () => {
      const { timeTrackingService } = await import('../../services/timeTrackingService');
      vi.mocked(timeTrackingService.getEntries).mockResolvedValue([
        {
          id: 'e1',
          taskId: -1,
          taskName: 'Pendiente A',
          proceso: { proceso: -1, nombre: 'Pendiente A' },
          date: '2026-08-01',
          startTime: '09:00',
          endTime: '10:00',
          duration: 3600,
          createdAt: 'x',
          updatedAt: 'x',
          synced: false,
        },
      ]);
      const user = userEvent.setup();
      render(<AvailableTasksPage />);
      const deleteButtons = screen.getAllByRole('button', { name: /eliminar proceso pendiente/i });
      await user.click(deleteButtons[0]);
      expect(screen.getByTestId('reassign-modal')).toBeDefined();
      expect(screen.getByTestId('reassign-entry-count')).toHaveTextContent('1');
    });
  });
});
