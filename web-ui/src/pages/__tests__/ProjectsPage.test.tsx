import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectsPage } from '../ProjectsPage';
import { useProjects } from '@/features/projects/hooks/use-projects';
import type { Project } from '@/features/projects/types';

vi.mock('@/features/projects/hooks/use-projects');

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithProviders(ui: React.ReactElement) {
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

describe('ProjectsPage keyboard navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('Home moves to first row, End moves to last row', async () => {
    const user = userEvent.setup();
    vi.mocked(useProjects).mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    renderWithProviders(<ProjectsPage />);

    const table = screen.getByRole('table');
    table.focus();

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

    const table = screen.getByRole('table');
    table.focus();

    await user.keyboard('{ArrowDown}');
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

    // Focus table and activate a row
    const table = screen.getByRole('table');
    table.focus();
    await user.keyboard('{ArrowDown}');
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
