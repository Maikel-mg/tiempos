import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useProcessCache } from '../useProcessCache';
import type { Proceso } from '../../types';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockWizardGet = vi.fn();
const mockGetProcesses = vi.fn();
const mockGetLastUpdated = vi.fn();

vi.mock('@/features/time-tracker/services/ProcessOfflineService', () => ({
  processOfflineService: {
    getProcesses: (...args: unknown[]) => mockGetProcesses(...args),
    getLastUpdated: (...args: unknown[]) => mockGetLastUpdated(...args),
  },
}));

vi.mock('@/config/stores', () => ({
  wizardConfig: { get: () => mockWizardGet() },
  dbConfig: { get: () => null },
  scheduleConfig: {
    get: () => ({
      defaultHours: { mon: 8.25, tue: 8.25, wed: 8.25, thu: 8.25, fri: 7, sat: 0, sun: 0 },
      exceptions: [],
    }),
  },
}));

// ── Test data ────────────────────────────────────────────────────────────────

const PROCESOS: Proceso[] = [
  { proceso: 101, nombre: 'Desarrollo Frontend', faseNombre: 'Fase Construccion' },
  { proceso: 102, nombre: 'Desarrollo Backend', faseNombre: 'Fase Construccion' },
];

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useProcessCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLastUpdated.mockResolvedValue(null);
  });

  it('fetches processes from the service when usuario is set and cache is empty', async () => {
    mockWizardGet.mockReturnValue({ usuario: 'MG01' });
    mockGetProcesses.mockResolvedValue(PROCESOS);

    const { result } = renderHook(() => useProcessCache());

    await waitFor(() => {
      expect(result.current.processes).toHaveLength(2);
    });

    expect(result.current.processes[0].nombre).toBe('Desarrollo Frontend');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockGetProcesses).toHaveBeenCalledWith('MG01', { refresh: true });
  });

  it('returns empty processes without calling the service when usuario is empty', async () => {
    mockWizardGet.mockReturnValue({ usuario: '' });

    const { result } = renderHook(() => useProcessCache());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.processes).toHaveLength(0);
    expect(result.current.error).toBeNull();
    expect(mockGetProcesses).not.toHaveBeenCalled();
    expect(mockGetLastUpdated).not.toHaveBeenCalled();
  });

  it('returns empty processes without calling the service when usuario is null', async () => {
    mockWizardGet.mockReturnValue(null);

    const { result } = renderHook(() => useProcessCache());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.processes).toHaveLength(0);
    expect(mockGetProcesses).not.toHaveBeenCalled();
  });

  it('serves cached data without fetching from the backend (no refresh call)', async () => {
    mockWizardGet.mockReturnValue({ usuario: 'MG01' });
    mockGetLastUpdated.mockResolvedValue(1234);
    mockGetProcesses.mockResolvedValue(PROCESOS);

    const { result } = renderHook(() => useProcessCache());

    await waitFor(() => {
      expect(result.current.processes).toHaveLength(2);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockGetProcesses).toHaveBeenCalledWith('MG01');
    expect(mockGetProcesses).not.toHaveBeenCalledWith('MG01', { refresh: true });
  });

  it('sets error when the service throws', async () => {
    mockWizardGet.mockReturnValue({ usuario: 'MG01' });
    mockGetProcesses.mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() => useProcessCache());

    await waitFor(() => {
      expect(result.current.error).toBe('Network failure');
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.processes).toHaveLength(0);
  });

  it('sets error message when the service returns a failed backend response', async () => {
    mockWizardGet.mockReturnValue({ usuario: 'MG01' });
    mockGetProcesses.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useProcessCache());

    await waitFor(() => {
      expect(result.current.error).toBe('Server error');
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.processes).toHaveLength(0);
  });

  it('refresh re-fetches from the backend and updates processes', async () => {
    mockWizardGet.mockReturnValue({ usuario: 'MG01' });
    mockGetProcesses.mockResolvedValue(PROCESOS);

    const { result } = renderHook(() => useProcessCache());

    await waitFor(() => {
      expect(result.current.processes).toHaveLength(2);
    });

    expect(result.current.loading).toBe(false);

    const moreProcesos: Proceso[] = [
      ...PROCESOS,
      { proceso: 103, nombre: 'Code Review' },
    ];
    mockGetProcesses.mockResolvedValue(moreProcesos);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.processes).toHaveLength(3);
    expect(mockGetProcesses).toHaveBeenCalledWith('MG01', { refresh: true });
    expect(mockGetProcesses).toHaveBeenCalledTimes(2);
  });
});
