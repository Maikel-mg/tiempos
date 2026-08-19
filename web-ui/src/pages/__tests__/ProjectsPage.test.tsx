import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectsPage } from '../ProjectsPage';
import { useProjects } from '@/features/projects/hooks/use-projects';
import type { Project } from '@/features/projects/types';
import type { OfflineProjectSelection } from '@/features/time-tracker/types';

vi.mock('@/features/projects/hooks/use-projects');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

const mockWizardGet = vi.fn();
const mockGetOfflineProjectSelections = vi.fn();
const mockMarkProjectOffline = vi.fn();
const mockRemoveProjectOffline = vi.fn();
const mockSetOfflineProjectStatus = vi.fn();
const mockGetProjectTree = vi.fn();

vi.mock('@/features/time-tracker/services/ProcessOfflineService', () => ({
  processOfflineService: {
    getOfflineProjectSelections: (...args: unknown[]) => mockGetOfflineProjectSelections(...args),
    markProjectOffline: (...args: unknown[]) => mockMarkProjectOffline(...args),
    removeProjectOffline: (...args: unknown[]) => mockRemoveProjectOffline(...args),
    setOfflineProjectStatus: (...args: unknown[]) => mockSetOfflineProjectStatus(...args),
    getProjectTree: (...args: unknown[]) => mockGetProjectTree(...args),
  },
}));

vi.mock('@/config/stores', () => ({
  wizardConfig: {
    get: () => mockWizardGet(),
    subscribe: () => () => undefined,
  },
  dbConfig: { get: () => null },
}));

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

  it('PageDown and PageUp are handled without crash', async () => {
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

    // PageDown should not crash
    await user.keyboard('{PageDown}');
    // PageUp should not crash
    await user.keyboard('{PageUp}');
  });
});

describe('ProjectsPage offline toggles', () => {
  const selectionPendiente: OfflineProjectSelection = {
    codCli: '1',
    proyecto: 'P1',
    nomProy: 'Project One',
    nomCliente: 'Client One',
    status: 'pendiente',
    markedAt: 1000,
  };

  const selectionSincronizado: OfflineProjectSelection = {
    ...selectionPendiente,
    status: 'sincronizado',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockWizardGet.mockReturnValue({ usuario: 'MG01' });
    mockGetOfflineProjectSelections.mockResolvedValue([]);
    mockMarkProjectOffline.mockImplementation((_usured: string, input: { codCli: string; proyecto: string }) =>
      Promise.resolve({
        codCli: input.codCli,
        proyecto: input.proyecto,
        nomProy: 'Project One',
        nomCliente: 'Client One',
        status: 'pendiente' as const,
        markedAt: Date.now(),
      })
    );
    mockRemoveProjectOffline.mockResolvedValue(undefined);
    mockSetOfflineProjectStatus.mockResolvedValue(undefined);
  });

  function mockProjectsQuery() {
    vi.mocked(useProjects).mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);
  }

  it('renders a "Disponible offline" toggle for each project row', async () => {
    mockProjectsQuery();

    renderWithProviders(<ProjectsPage />);

    expect(await screen.findAllByRole('switch')).toHaveLength(2);
  });

  it('marks a project and shows "Sincronizado" when the tree refresh succeeds', async () => {
    mockProjectsQuery();
    mockGetProjectTree.mockResolvedValue({
      cliente: { codCli: 1, cliente: 'C1', nomCliente: 'Client One' },
      proyecto: { codCli: 1, proyecto: 1, nomProy: 'Project One', cerrado: false, cmmi: false, esCM: false, esPET: false },
      disciplinas: [],
    });
    mockGetOfflineProjectSelections
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([selectionSincronizado]);

    renderWithProviders(<ProjectsPage />);

    await screen.findAllByRole('switch');
    // Let the mount load resolve so the switch nodes are stable before clicking.
    await act(async () => {});

    await userEvent.setup().click(screen.getAllByRole('switch')[0]);

    expect(await screen.findByText('Sincronizado')).toBeInTheDocument();
    expect(mockMarkProjectOffline).toHaveBeenCalledWith('MG01', {
      codCli: '1',
      proyecto: 'P1',
      nomProy: 'Project One',
      nomCliente: 'Client One',
    });
    expect(mockGetProjectTree).toHaveBeenCalledWith('MG01', '1', 'P1', { refresh: true });
    expect(mockSetOfflineProjectStatus).toHaveBeenCalledWith('MG01', '1', 'P1', 'sincronizado');
  });

  it('marks a project and keeps "Pendiente de sincronizar" when the tree refresh fails (offline)', async () => {
    mockProjectsQuery();
    mockGetProjectTree.mockRejectedValue(new Error('Network failure'));
    mockGetOfflineProjectSelections
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([selectionPendiente]);

    renderWithProviders(<ProjectsPage />);

    await screen.findAllByRole('switch');
    await act(async () => {});

    await userEvent.setup().click(screen.getAllByRole('switch')[0]);

    expect(await screen.findByText('Pendiente de sincronizar')).toBeInTheDocument();
    expect(mockSetOfflineProjectStatus).not.toHaveBeenCalled();
  });

  it('unmarks a project calling removeProjectOffline and reflects the state', async () => {
    mockProjectsQuery();
    mockGetOfflineProjectSelections
      .mockResolvedValueOnce([selectionPendiente])
      .mockResolvedValueOnce([]);

    renderWithProviders(<ProjectsPage />);

    await screen.findAllByRole('switch');
    await act(async () => {});
    const firstToggle = screen.getAllByRole('switch')[0];
    expect(firstToggle).toBeChecked();

    await userEvent.setup().click(firstToggle);

    expect(mockRemoveProjectOffline).toHaveBeenCalledWith('MG01', '1', 'P1');
    await waitFor(() => {
      expect(screen.getAllByRole('switch')[0]).not.toBeChecked();
    });
    expect(screen.queryByText('Pendiente de sincronizar')).toBeNull();
  });

  it('persists the offline state across page reloads (selections loaded from storage)', async () => {
    mockProjectsQuery();
    mockGetOfflineProjectSelections.mockResolvedValue([selectionSincronizado]);

    renderWithProviders(<ProjectsPage />);

    await screen.findAllByRole('switch');
    await waitFor(() => {
      expect(screen.getAllByRole('switch')[0]).toBeChecked();
    });
    expect(screen.getByText('Sincronizado')).toBeInTheDocument();
  });

  it('disables the toggles when no usuario is configured', async () => {
    mockWizardGet.mockReturnValue({ usuario: '' });
    mockProjectsQuery();

    renderWithProviders(<ProjectsPage />);

    const switches = await screen.findAllByRole('switch');
    expect(switches).toHaveLength(2);
    for (const toggle of switches) {
      expect(toggle).toBeDisabled();
    }
  });
});
