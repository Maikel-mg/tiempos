import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useProcessCache } from '../useProcessCache';
import type { Proceso } from '../../types';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockWizardGet = vi.fn();
const mockDbGet = vi.fn();
const mockApiClientPost = vi.fn();

vi.mock('@/lib/api/client', () => ({
  apiClient: { post: (...args: unknown[]) => mockApiClientPost(...args) },
}));

vi.mock('@/config/stores', () => ({
  wizardConfig: { get: () => mockWizardGet() },
  dbConfig: { get: () => mockDbGet() },
}));

// ── Test data ────────────────────────────────────────────────────────────────

const DB_CONFIG = {
  server: 'test-server',
  database: 'test-db',
  username: 'test-user',
  password: 'test-pass',
};

const PROCESOS: Proceso[] = [
  { proceso: 101, nombre: 'Desarrollo Frontend', faseNombre: 'Fase Construccion' },
  { proceso: 102, nombre: 'Desarrollo Backend', faseNombre: 'Fase Construccion' },
];

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useProcessCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbGet.mockReturnValue(DB_CONFIG);
  });

  it('fetches processes on mount when usuario is set', async () => {
    mockWizardGet.mockReturnValue({ usuario: 'MG01' });
    mockApiClientPost.mockResolvedValue({ success: true, data: PROCESOS });

    const { result } = renderHook(() => useProcessCache());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.processes).toHaveLength(2);
    expect(result.current.processes[0].nombre).toBe('Desarrollo Frontend');
    expect(result.current.error).toBeNull();
    expect(mockApiClientPost).toHaveBeenCalledWith('/processes', {
      usured: 'MG01',
      server: 'test-server',
      database: 'test-db',
      username: 'test-user',
      password: 'test-pass',
    });
  });

  it('returns empty processes without fetch when usuario is empty', async () => {
    mockWizardGet.mockReturnValue({ usuario: '' });

    const { result } = renderHook(() => useProcessCache());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.processes).toHaveLength(0);
    expect(result.current.error).toBeNull();
    expect(mockApiClientPost).not.toHaveBeenCalled();
  });

  it('returns empty processes without fetch when usuario is null', async () => {
    mockWizardGet.mockReturnValue(null);

    const { result } = renderHook(() => useProcessCache());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.processes).toHaveLength(0);
    expect(mockApiClientPost).not.toHaveBeenCalled();
  });

  it('sets error when endpoint fails', async () => {
    mockWizardGet.mockReturnValue({ usuario: 'MG01' });
    mockApiClientPost.mockResolvedValue({
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
    mockWizardGet.mockReturnValue({ usuario: 'MG01' });
    mockApiClientPost.mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() => useProcessCache());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network failure');
    expect(result.current.processes).toHaveLength(0);
  });

  it('refresh re-fetches and updates processes', async () => {
    mockWizardGet.mockReturnValue({ usuario: 'MG01' });
    mockApiClientPost.mockResolvedValueOnce({ success: true, data: PROCESOS });

    const { result } = renderHook(() => useProcessCache());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.processes).toHaveLength(2);

    const moreProcesos: Proceso[] = [
      ...PROCESOS,
      { proceso: 103, nombre: 'Code Review' },
    ];
    mockApiClientPost.mockResolvedValueOnce({ success: true, data: moreProcesos });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.processes).toHaveLength(3);
    expect(mockApiClientPost).toHaveBeenCalledTimes(2);
  });
});
