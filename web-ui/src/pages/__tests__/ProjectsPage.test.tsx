import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectsPage } from '../ProjectsPage';
import { useProjects } from '@/features/projects/hooks/use-projects';
import type { Project } from '@/features/projects/types';

vi.mock('@/features/projects/hooks/use-projects');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const mockNavigate = vi.fn();

function renderWithProviders(ui: React.ReactElement) {
  vi.mocked(useNavigate).mockReturnValue(mockNavigate);
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

const mockProjects: Project[] = [
  {
    CodCli: '1',
    Cliente: 'Client 1',
    NomCliente: 'Client One',
    NomProy: 'Project One',
    Proyecto: 'P1',
    Abierto: true,
    IdDpto: 'D1',
    NomDpto: 'Department 1',
    IdAplicacion: 'App1',
    UsuredRespRev: 'user1',
  },
  {
    CodCli: '2',
    Cliente: 'Client 2',
    NomCliente: 'Client Two',
    NomProy: 'Project Two',
    Proyecto: 'P2',
    Abierto: false,
    IdDpto: 'D2',
    NomDpto: 'Department 2',
    IdAplicacion: 'App2',
    UsuredRespRev: 'user2',
  },
];

describe('ProjectsPage auto-focus on mount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('auto-focuses first table row on mount when data is loaded', async () => {
    vi.mocked(useProjects).mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithProviders(<ProjectsPage />);

    const rows = screen.getAllByRole('row');
    // rows[0] is header, rows[1] is first data row
    expect(rows[1]?.getAttribute('data-state')).toBe('active');
  });

  it('does not auto-focus when projects list is empty', () => {
    vi.mocked(useProjects).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithProviders(<ProjectsPage />);

    // No table rendered — empty state shown
    const rows = screen.queryAllByRole('row');
    expect(rows).toHaveLength(0);
  });

  it('does not auto-focus during loading', () => {
    vi.mocked(useProjects).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithProviders(<ProjectsPage />);
    expect(screen.getByText('Cargando proyectos...')).toBeDefined();
  });
});

describe('ProjectsPage keyboard navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Enter on active row triggers navigation', async () => {
    const user = userEvent.setup();
    mockNavigate.mockClear();
    vi.mocked(useProjects).mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithProviders(<ProjectsPage />);

    // Auto-focus already on row 0
    const rows = screen.getAllByRole('row');
    expect(rows[1]?.getAttribute('data-state')).toBe('active');

    // Press Enter — should trigger navigation
    await user.keyboard('{Enter}');

    // Verify navigate was called with the correct path
    expect(mockNavigate).toHaveBeenCalledWith('/projects/1/P1');
  });

  it('ArrowDown moves highlight across visible rows', async () => {
    const user = userEvent.setup();
    vi.mocked(useProjects).mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithProviders(<ProjectsPage />);

    // Auto-focus already on row 0
    const rows = screen.getAllByRole('row');
    expect(rows[1]?.getAttribute('data-state')).toBe('active');

    // Move to second data row
    await user.keyboard('{ArrowDown}');
    expect(rows[2]?.getAttribute('data-state')).toBe('active');

    // Move back up
    await user.keyboard('{ArrowUp}');
    expect(rows[1]?.getAttribute('data-state')).toBe('active');
  });

  it('Home moves to first row, End moves to last row', async () => {
    const user = userEvent.setup();
    vi.mocked(useProjects).mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithProviders(<ProjectsPage />);

    // Auto-focus already on row 0
    const rows = screen.getAllByRole('row');

    // End goes to last data row
    await user.keyboard('{End}');
    expect(rows[2]?.getAttribute('data-state')).toBe('active');

    // Home goes to first data row
    await user.keyboard('{Home}');
    expect(rows[1]?.getAttribute('data-state')).toBe('active');
  });

  it('Escape clears active row', async () => {
    const user = userEvent.setup();
    vi.mocked(useProjects).mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithProviders(<ProjectsPage />);

    // Auto-focus already on row 0
    const rows = screen.getAllByRole('row');
    expect(rows[1]?.getAttribute('data-state')).toBe('active');

    await user.keyboard('{Escape}');
    const activeRows = rows.filter(r => r.getAttribute('data-state') === 'active');
    expect(activeRows).toHaveLength(0);
  });

  it('Arrow keys are ignored when search input is focused', async () => {
    const user = userEvent.setup();
    vi.mocked(useProjects).mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithProviders(<ProjectsPage />);

    // Auto-focus already on row 0
    const rows = screen.getAllByRole('row');
    expect(rows[1]?.getAttribute('data-state')).toBe('active');

    // Focus a search input
    const searchInput = screen.getByPlaceholderText(/buscar/i);
    searchInput.focus();

    // ArrowDown should NOT change the active row
    await user.keyboard('{ArrowDown}');
    expect(rows[1]?.getAttribute('data-state')).toBe('active');
  });
});
