import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useProcessCache } from '../useProcessCache';
import type { Proceso } from '../../types';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGet = vi.fn();
const mockApiClientGet = vi.fn();

vi.mock('@/lib/api/client', () => ({
  apiClient: { get: (...args: unknown[]) => mockApiClientGet(...args) },
}));

vi.mock('@/config/stores', () => ({
  wizardConfig: { get: () => mockGet() },
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
  });

  it('fetches processes on mount when usuario is set', async () => {
    mockGet.mockReturnValue({ usuario: 'MG01' });
    mockApiClientGet.mockResolvedValue({ success: true, data: PROCESOS });

    const { result } = renderHook(() => useProcessCache());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.processes).toHaveLength(2);
    expect(result.current.processes[0].nombre).toBe('Desarrollo Frontend');
    expect(result.current.error).toBeNull();
    expect(mockApiClientGet).toHaveBeenCalledWith('/processes?usured=MG01');
  });

  it('returns empty processes without fetch when usuario is empty', async () => {
    mockGet.mockReturnValue({ usuario: '' });

    const { result } = renderHook(() => useProcessCache());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.processes).toHaveLength(0);
    expect(result.current.error).toBeNull();
    expect(mockApiClientGet).not.toHaveBeenCalled();
  });

  it('returns empty processes without fetch when usuario is null', async () => {
    mockGet.mockReturnValue(null);

    const { result } = renderHook(() => useProcessCache());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.processes).toHaveLength(0);
    expect(mockApiClientGet).not.toHaveBeenCalled();
  });

  it('sets error when endpoint fails', async () => {
    mockGet.mockReturnValue({ usuario: 'MG01' });
    mockApiClientGet.mockResolvedValue({
      success: false,
      message: 'Server error',
    });

    const { result } = renderHook(() => useProcessCache());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Server error');
    expect(result.current.processes).toHaveLength(0);
  });

  it('sets error when network call throws', async () => {
    mockGet.mockReturnValue({ usuario: 'MG01' });
    mockApiClientGet.mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() => useProcessCache());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network failure');
    expect(result.current.processes).toHaveLength(0);
  });

  it('refresh re-fetches and updates processes', async () => {
    mockGet.mockReturnValue({ usuario: 'MG01' });
    mockApiClientGet.mockResolvedValueOnce({ success: true, data: PROCESOS });

    const { result } = renderHook(() => useProcessCache());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.processes).toHaveLength(2);

    // Now set up a different response for refresh
    const moreProcesos: Proceso[] = [
      ...PROCESOS,
      { proceso: 103, nombre: 'Code Review' },
    ];
    mockApiClientGet.mockResolvedValueOnce({ success: true, data: moreProcesos });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.processes).toHaveLength(3);
    expect(mockApiClientGet).toHaveBeenCalledTimes(2);
  });
});
