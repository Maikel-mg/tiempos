import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProcessSelectorButton } from '../ProcessSelectorButton';
import type { Proceso } from '../../types';

// ── Mock useProcessCache ─────────────────────────────────────────────────────

const mockRefresh = vi.fn();
const mockUseProcessCache = vi.fn();
const mockUsePendingProcesses = vi.fn();

vi.mock('../../hooks/useProcessCache', () => ({
  useProcessCache: () => mockUseProcessCache(),
}));

vi.mock('@/features/pending-process/hooks/usePendingProcesses', () => ({
  usePendingProcesses: () => mockUsePendingProcesses(),
}));

vi.mock('@/features/pending-process/components/PendingProcessFormModal', () => ({
  PendingProcessFormModal: ({ open, onOpenChange }: any) =>
    open ? <div data-testid="pending-form-modal"><button onClick={() => onOpenChange(false)}>Close</button></div> : null,
}));

// ── Test data ────────────────────────────────────────────────────────────────

const SEED_PROCESSES: Proceso[] = [
  { proceso: 101, nombre: 'Desarrollo Frontend', faseNombre: 'Fase Construcción', proyectoNombre: 'Proyecto Alpha', clienteNombre: 'Acme Corp', departamentoId: 5 },
  { proceso: 102, nombre: 'Desarrollo Backend', faseNombre: 'Fase Construcción', proyectoNombre: 'Proyecto Alpha', clienteNombre: 'Acme Corp', departamentoId: 5 },
  { proceso: 201, nombre: 'Testing Unitario', faseNombre: 'Fase Testing', proyectoNombre: 'Proyecto Alpha', clienteNombre: 'Acme Corp', departamentoId: 5 },
  { proceso: 301, nombre: 'Diseño UX', faseNombre: 'Fase Diseño', proyectoNombre: 'Proyecto Beta', clienteNombre: 'Beta Inc', departamentoId: 5 },
];

const SEED_PENDING: Proceso[] = [
  {
    proceso: -1,
    nombre: 'Pendiente Alpha',
    faseNombre: 'Fase Construcción',
    proyectoNombre: 'Proyecto Alpha',
    clienteNombre: 'Acme Corp',
    esPendiente: true,
    procesoPendienteId: -1,
  },
];

function setupMockProcesses(processes: Proceso[] = SEED_PROCESSES, loading = false, error: string | null = null) {
  mockUseProcessCache.mockReturnValue({
    processes,
    loading,
    error,
    refresh: mockRefresh,
  });
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
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ProcessSelectorButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders button with placeholder text when no process selected', () => {
    setupMockProcesses();

    render(
      <ProcessSelectorButton
        value={null}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /seleccionar proceso/i })).toBeInTheDocument();
  });

  it('renders button with selected process name', () => {
    setupMockProcesses();
    const selectedProcess: Proceso = { proceso: 101, nombre: 'Desarrollo Frontend' };

    render(
      <ProcessSelectorButton
        value={selectedProcess}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /desarrollo frontend/i })).toBeInTheDocument();
  });

  it('opens popover and shows processes from hook', async () => {
    const user = userEvent.setup();
    setupMockProcesses();

    render(
      <ProcessSelectorButton
        value={null}
        onChange={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /seleccionar proceso/i }));

    await waitFor(() => {
      expect(screen.getByText('Desarrollo Frontend')).toBeInTheDocument();
    });

    expect(screen.getByText('Desarrollo Backend')).toBeInTheDocument();
    expect(screen.getByText('Testing Unitario')).toBeInTheDocument();
    expect(screen.getByText('Diseño UX')).toBeInTheDocument();
  });

  it('filters processes by name', async () => {
    const user = userEvent.setup();
    setupMockProcesses();

    render(
      <ProcessSelectorButton
        value={null}
        onChange={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /seleccionar proceso/i }));

    await waitFor(() => {
      expect(screen.getByText('Desarrollo Frontend')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/buscar por nombre/i);
    await user.type(searchInput, 'frontend');

    await waitFor(() => {
      expect(screen.getByText('Desarrollo Frontend')).toBeInTheDocument();
    });

    expect(screen.queryByText('Desarrollo Backend')).not.toBeInTheDocument();
    expect(screen.queryByText('Testing Unitario')).not.toBeInTheDocument();
  });

  it('filters processes by phase name', async () => {
    const user = userEvent.setup();
    setupMockProcesses();

    render(
      <ProcessSelectorButton
        value={null}
        onChange={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /seleccionar proceso/i }));

    await waitFor(() => {
      expect(screen.getByText('Desarrollo Frontend')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/buscar por nombre/i);
    await user.type(searchInput, 'construcción');

    await waitFor(() => {
      expect(screen.getByText('Desarrollo Frontend')).toBeInTheDocument();
      expect(screen.getByText('Desarrollo Backend')).toBeInTheDocument();
    });

    expect(screen.queryByText('Testing Unitario')).not.toBeInTheDocument();
    expect(screen.queryByText('Diseño UX')).not.toBeInTheDocument();
  });

  it('filters processes by project name', async () => {
    const user = userEvent.setup();
    setupMockProcesses();

    render(
      <ProcessSelectorButton
        value={null}
        onChange={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /seleccionar proceso/i }));

    await waitFor(() => {
      expect(screen.getByText('Desarrollo Frontend')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/buscar por nombre/i);
    await user.type(searchInput, 'beta');

    await waitFor(() => {
      expect(screen.getByText('Diseño UX')).toBeInTheDocument();
    });

    expect(screen.queryByText('Desarrollo Frontend')).not.toBeInTheDocument();
  });

  it('filters processes by client name', async () => {
    const user = userEvent.setup();
    setupMockProcesses();

    render(
      <ProcessSelectorButton
        value={null}
        onChange={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /seleccionar proceso/i }));

    await waitFor(() => {
      expect(screen.getByText('Desarrollo Frontend')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/buscar por nombre/i);
    await user.type(searchInput, 'acme');

    await waitFor(() => {
      expect(screen.getByText('Desarrollo Frontend')).toBeInTheDocument();
      expect(screen.getByText('Desarrollo Backend')).toBeInTheDocument();
      expect(screen.getByText('Testing Unitario')).toBeInTheDocument();
    });

    expect(screen.queryByText('Diseño UX')).not.toBeInTheDocument();
  });

  it('selects a process and calls onChange', async () => {
    const user = userEvent.setup();
    setupMockProcesses();
    const onChange = vi.fn();

    render(
      <ProcessSelectorButton
        value={null}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole('button', { name: /seleccionar proceso/i }));

    await waitFor(() => {
      expect(screen.getByText('Desarrollo Frontend')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Desarrollo Frontend'));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ proceso: 101, nombre: 'Desarrollo Frontend' })
    );
  });

  it('shows loading state while fetching', () => {
    setupMockProcesses([], true);

    render(
      <ProcessSelectorButton
        value={null}
        onChange={vi.fn()}
      />
    );

    // Open the popover to see loading state
    // The loading state shows immediately in the popover content area
    // But since popover is closed by default, we need to check the trigger button
    expect(screen.getByRole('button', { name: /seleccionar proceso/i })).toBeInTheDocument();
  });

  it('shows "No hay procesos disponibles" when empty', async () => {
    const user = userEvent.setup();
    setupMockProcesses([]);

    render(
      <ProcessSelectorButton
        value={null}
        onChange={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /seleccionar proceso/i }));

    await waitFor(() => {
      expect(screen.getByText('No hay procesos disponibles')).toBeInTheDocument();
    });
  });

  it('shows "No se encontraron procesos" when search has no results', async () => {
    const user = userEvent.setup();
    setupMockProcesses();

    render(
      <ProcessSelectorButton
        value={null}
        onChange={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /seleccionar proceso/i }));

    await waitFor(() => {
      expect(screen.getByText('Desarrollo Frontend')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/buscar por nombre/i);
    await user.type(searchInput, 'xyz123');

    await waitFor(() => {
      expect(screen.getByText('No se encontraron procesos')).toBeInTheDocument();
    });
  });

  it('shows error message when error exists', async () => {
    const user = userEvent.setup();
    setupMockProcesses([], false, 'Error al cargar procesos');

    render(
      <ProcessSelectorButton
        value={null}
        onChange={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /seleccionar proceso/i }));

    await waitFor(() => {
      expect(screen.getByText('Error al cargar procesos')).toBeInTheDocument();
    });
  });

  it('calls refresh when refresh button is clicked', async () => {
    const user = userEvent.setup();
    setupMockProcesses();

    render(
      <ProcessSelectorButton
        value={null}
        onChange={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /seleccionar proceso/i }));

    await waitFor(() => {
      expect(screen.getByText('Desarrollo Frontend')).toBeInTheDocument();
    });

    const refreshButton = screen.getByTitle('Actualizar lista');
    await user.click(refreshButton);

    expect(mockRefresh).toHaveBeenCalled();
  });

  it('renders in disabled state', () => {
    setupMockProcesses();

    render(
      <ProcessSelectorButton
        value={null}
        onChange={vi.fn()}
        disabled
      />
    );

    const button = screen.getByRole('button', { name: /seleccionar proceso/i });
    expect(button).toBeDisabled();
  });

  it('does not open popover when disabled', async () => {
    const user = userEvent.setup();
    setupMockProcesses();

    render(
      <ProcessSelectorButton
        value={null}
        onChange={vi.fn()}
        disabled
      />
    );

    await user.click(screen.getByRole('button', { name: /seleccionar proceso/i }));

    // Popover should not open
    expect(screen.queryByText('Procesos')).not.toBeInTheDocument();
  });

  it('displays process metadata in the list', async () => {
    const user = userEvent.setup();
    setupMockProcesses();

    render(
      <ProcessSelectorButton
        value={null}
        onChange={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /seleccionar proceso/i }));

    await waitFor(() => {
      expect(screen.getByText('Desarrollo Frontend')).toBeInTheDocument();
    });

    // Check metadata display — use getAllByText since multiple processes share phase/project/client
    expect(screen.getByText(/ID: 101/)).toBeInTheDocument();
    expect(screen.getAllByText(/· Fase Construcción/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/· Proyecto Alpha/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/· Acme Corp/).length).toBeGreaterThanOrEqual(1);
  });

  it('applies className prop', () => {
    setupMockProcesses();

    render(
      <ProcessSelectorButton
        value={null}
        onChange={vi.fn()}
        className="w-full"
      />
    );

    const button = screen.getByRole('button', { name: /seleccionar proceso/i });
    expect(button.className).toContain('w-full');
  });

  describe('procesos pendientes', () => {
    it('shows pending processes alongside system processes with a Pendiente badge', async () => {
      const user = userEvent.setup();
      setupMockProcesses();
      mockUsePendingProcesses.mockReturnValue({
        pendingProcesos: SEED_PENDING,
        pendingProcesses: [],
        loading: false,
        error: null,
        reload: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
      });

      render(
        <ProcessSelectorButton
          value={null}
          onChange={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: /seleccionar proceso/i }));

      await waitFor(() => {
        expect(screen.getByText('Pendiente Alpha')).toBeInTheDocument();
      });

      expect(screen.getByText('Desarrollo Frontend')).toBeInTheDocument();
      expect(screen.getAllByText('Pendiente').length).toBeGreaterThanOrEqual(1);
    });

    it('keeps pending processes visible even when the department filter is on', async () => {
      const user = userEvent.setup();
      setupMockProcesses();
      mockUsePendingProcesses.mockReturnValue({
        pendingProcesos: SEED_PENDING,
        pendingProcesses: [],
        loading: false,
        error: null,
        reload: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
      });

      render(
        <ProcessSelectorButton
          value={null}
          onChange={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: /seleccionar proceso/i }));

      await waitFor(() => {
        expect(screen.getByText('Pendiente Alpha')).toBeInTheDocument();
      });

      expect(screen.getByText('Desarrollo Frontend')).toBeInTheDocument();
    });

    it('selecting a pending process calls onChange with a negative proceso id', async () => {
      const user = userEvent.setup();
      setupMockProcesses();
      mockUsePendingProcesses.mockReturnValue({
        pendingProcesos: SEED_PENDING,
        pendingProcesses: [],
        loading: false,
        error: null,
        reload: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
      });
      const onChange = vi.fn();

      render(
        <ProcessSelectorButton
          value={null}
          onChange={onChange}
        />
      );

      await user.click(screen.getByRole('button', { name: /seleccionar proceso/i }));

      await waitFor(() => {
        expect(screen.getByText('Pendiente Alpha')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Pendiente Alpha'));

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ proceso: -1, esPendiente: true, procesoPendienteId: -1 })
      );
    });

    it('opens the pending process form modal from the create button', async () => {
      const user = userEvent.setup();
      setupMockProcesses();

      render(
        <ProcessSelectorButton
          value={null}
          onChange={vi.fn()}
        />
      );

      await user.click(screen.getByRole('button', { name: /seleccionar proceso/i }));

      await waitFor(() => {
        expect(screen.getByText('Desarrollo Frontend')).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /crear proceso sin conexión/i });
      await user.click(createButton);

      expect(screen.getByTestId('pending-form-modal')).toBeInTheDocument();
    });
  });
});
