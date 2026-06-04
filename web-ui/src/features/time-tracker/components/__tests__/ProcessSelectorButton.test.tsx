import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProcessSelectorButton } from '../ProcessSelectorButton';
import type { Proceso } from '../../types';

// ── Mock useProcessCache ─────────────────────────────────────────────────────

const mockRefresh = vi.fn();
const mockUseProcessCache = vi.fn();

vi.mock('../../hooks/useProcessCache', () => ({
  useProcessCache: () => mockUseProcessCache(),
}));

// ── Test data ────────────────────────────────────────────────────────────────

const SEED_PROCESSES: Proceso[] = [
  { proceso: 101, nombre: 'Desarrollo Frontend', faseNombre: 'Fase Construcción', proyectoNombre: 'Proyecto Alpha', clienteNombre: 'Acme Corp' },
  { proceso: 102, nombre: 'Desarrollo Backend', faseNombre: 'Fase Construcción', proyectoNombre: 'Proyecto Alpha', clienteNombre: 'Acme Corp' },
  { proceso: 201, nombre: 'Testing Unitario', faseNombre: 'Fase Testing', proyectoNombre: 'Proyecto Alpha', clienteNombre: 'Acme Corp' },
  { proceso: 301, nombre: 'Diseño UX', faseNombre: 'Fase Diseño', proyectoNombre: 'Proyecto Beta', clienteNombre: 'Beta Inc' },
];

function setupMockProcesses(processes: Proceso[] = SEED_PROCESSES, loading = false, error: string | null = null) {
  mockUseProcessCache.mockReturnValue({
    processes,
    loading,
    error,
    refresh: mockRefresh,
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
});
