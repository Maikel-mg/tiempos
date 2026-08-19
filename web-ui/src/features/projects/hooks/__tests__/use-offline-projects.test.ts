import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useOfflineProjects } from '../use-offline-projects';
import type { Project } from '../../types';
import type { OfflineProjectSelection } from '@/features/time-tracker/types';

// ── Mocks ────────────────────────────────────────────────────────────────────

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

// ── Test data ────────────────────────────────────────────────────────────────

const PROJECT: Project = {
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
};

const SELECTION_PENDIENTE: OfflineProjectSelection = {
  codCli: '1',
  proyecto: 'P1',
  nomProy: 'Project One',
  nomCliente: 'Client One',
  status: 'pendiente',
  markedAt: 1000,
};

const SELECTION_SINCRONIZADO: OfflineProjectSelection = {
  ...SELECTION_PENDIENTE,
  status: 'sincronizado',
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useOfflineProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWizardGet.mockReturnValue({ usuario: 'MG01' });
    mockGetOfflineProjectSelections.mockResolvedValue([]);
  });

  it('loads offline selections on mount for the current usuario', async () => {
    mockGetOfflineProjectSelections.mockResolvedValue([SELECTION_PENDIENTE]);

    const { result } = renderHook(() => useOfflineProjects());

    await waitFor(() => {
      expect(result.current.selections).toHaveLength(1);
    });

    expect(mockGetOfflineProjectSelections).toHaveBeenCalledWith('MG01');
    expect(result.current.selections[0].status).toBe('pendiente');
  });

  it('markProject marks the project, syncs the tree and sets status "sincronizado"', async () => {
    mockMarkProjectOffline.mockResolvedValue(SELECTION_PENDIENTE);
    mockGetProjectTree.mockResolvedValue({
      cliente: { codCli: 1, cliente: 'C1', nomCliente: 'Client One' },
      proyecto: { codCli: 1, proyecto: 1, nomProy: 'Project One', cerrado: false, cmmi: false, esCM: false, esPET: false },
      disciplinas: [],
    });
    mockSetOfflineProjectStatus.mockResolvedValue(undefined);
    mockGetOfflineProjectSelections.mockResolvedValue([SELECTION_SINCRONIZADO]);

    const { result } = renderHook(() => useOfflineProjects());

    await waitFor(() => {
      expect(result.current.selections).toHaveLength(0);
    });

    await act(async () => {
      await result.current.markProject(PROJECT);
    });

    expect(mockMarkProjectOffline).toHaveBeenCalledWith('MG01', {
      codCli: '1',
      proyecto: 'P1',
      nomProy: 'Project One',
      nomCliente: 'Client One',
    });
    expect(mockGetProjectTree).toHaveBeenCalledWith('MG01', '1', 'P1', { refresh: true });
    expect(mockSetOfflineProjectStatus).toHaveBeenCalledWith('MG01', '1', 'P1', 'sincronizado');
    expect(result.current.selections[0].status).toBe('sincronizado');
  });

  it('markProject keeps status "pendiente" when the tree refresh fails (offline)', async () => {
    mockMarkProjectOffline.mockResolvedValue(SELECTION_PENDIENTE);
    mockGetProjectTree.mockRejectedValue(new Error('Network failure'));
    mockGetOfflineProjectSelections.mockResolvedValue([SELECTION_PENDIENTE]);

    const { result } = renderHook(() => useOfflineProjects());

    await waitFor(() => {
      expect(result.current.selections).toHaveLength(0);
    });

    await act(async () => {
      await result.current.markProject(PROJECT);
    });

    expect(mockGetProjectTree).toHaveBeenCalledWith('MG01', '1', 'P1', { refresh: true });
    expect(mockSetOfflineProjectStatus).not.toHaveBeenCalled();
    expect(result.current.selections[0].status).toBe('pendiente');
  });

  it('markProject stays marked even if the tree refresh fails', async () => {
    mockMarkProjectOffline.mockResolvedValue(SELECTION_PENDIENTE);
    mockGetProjectTree.mockRejectedValue(new Error('Network failure'));
    mockGetOfflineProjectSelections.mockResolvedValue([SELECTION_PENDIENTE]);

    const { result } = renderHook(() => useOfflineProjects());

    await waitFor(() => {
      expect(result.current.selections).toHaveLength(0);
    });

    await act(async () => {
      await result.current.markProject(PROJECT);
    });

    expect(mockMarkProjectOffline).toHaveBeenCalledTimes(1);
    expect(result.current.selections).toHaveLength(1);
  });

  it('removeProject calls removeProjectOffline and refreshes the selections', async () => {
    mockGetOfflineProjectSelections
      .mockResolvedValueOnce([SELECTION_PENDIENTE])
      .mockResolvedValueOnce([]);
    mockRemoveProjectOffline.mockResolvedValue(undefined);

    const { result } = renderHook(() => useOfflineProjects());

    await waitFor(() => {
      expect(result.current.selections).toHaveLength(1);
    });

    await act(async () => {
      await result.current.removeProject(PROJECT);
    });

    expect(mockRemoveProjectOffline).toHaveBeenCalledWith('MG01', '1', 'P1');
    expect(result.current.selections).toHaveLength(0);
  });

  it('does not call the service when no usuario is configured', async () => {
    mockWizardGet.mockReturnValue({ usuario: '' });

    const { result } = renderHook(() => useOfflineProjects());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.markProject(PROJECT);
      await result.current.removeProject(PROJECT);
    });

    expect(mockGetOfflineProjectSelections).not.toHaveBeenCalled();
    expect(mockMarkProjectOffline).not.toHaveBeenCalled();
    expect(mockRemoveProjectOffline).not.toHaveBeenCalled();
    expect(result.current.usuarioConfigured).toBe(false);
  });

  it('isMarking is true while a mark is in flight', async () => {
    let resolveMark!: (value: OfflineProjectSelection) => void;
    mockMarkProjectOffline.mockReturnValue(
      new Promise<OfflineProjectSelection>((resolve) => {
        resolveMark = resolve;
      })
    );
    mockGetOfflineProjectSelections.mockResolvedValue([SELECTION_PENDIENTE]);

    const { result } = renderHook(() => useOfflineProjects());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let markPromise!: Promise<void>;
    act(() => {
      markPromise = result.current.markProject(PROJECT);
    });

    expect(result.current.isMarking('1', 'P1')).toBe(true);

    await act(async () => {
      resolveMark(SELECTION_PENDIENTE);
      await markPromise;
    });

    expect(result.current.isMarking('1', 'P1')).toBe(false);
    expect(result.current.marking['1-P1']).toBeUndefined();
  });
});
