import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AvailableTasksPage } from '../AvailableTasksPage';
import { useProcessCache } from '../../hooks/useProcessCache';
import type { Proceso } from '../../types';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../hooks/useProcessCache');

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
});
