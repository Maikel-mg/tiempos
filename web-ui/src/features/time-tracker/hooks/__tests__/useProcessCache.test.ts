import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useProcessCache } from '../useProcessCache';
import type { LocalProcess, Proceso } from '../../types';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockWizardGet = vi.fn();
const mockDbGet = vi.fn();
const mockApiClientPost = vi.fn();

const { mockStorage } = vi.hoisted(() => ({
  mockStorage: {
    upsertProcesos: vi.fn(async () => {}),
    getAllProcesos: vi.fn(async (): Promise<Proceso[]> => []),
    getLocalProcesses: vi.fn(async (): Promise<LocalProcess[]> => []),
    upsertProceso: vi.fn(async () => {}),
  },
}));

vi.mock('@/lib/storage/IndexedDBStorage', () => ({ indexedDBStorage: mockStorage }));

vi.mock('@/lib/api/client', () => ({
  apiClient: { post: (...args: unknown[]) => mockApiClientPost(...args) },
}));

vi.mock('@/config/stores', () => ({
  wizardConfig: { get: () => mockWizardGet() },
  dbConfig: { get: () => mockDbGet() },
  scheduleConfig: {
    get: () => ({
      defaultHours: { mon: 8.25, tue: 8.25, wed: 8.25, thu: 8.25, fri: 7, sat: 0, sun: 0 },
      exceptions: [],
    }),
  },
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
    mockStorage.getAllProcesos.mockResolvedValue([]);
    mockStorage.getLocalProcesses.mockResolvedValue([]);
  });

  it('fetches processes on mount when usuario is set', async () => {
    mockWizardGet.mockReturnValue({ usuario: 'MG01' });
    // apiClient.post returns ApiClient-wrapped body: { success, data: <server body> }
    mockApiClientPost.mockResolvedValue({ success: true, data: { success: true, data: PROCESOS } });

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
    mockApiClientPost.mockResolvedValueOnce({ success: true, data: { success: true, data: PROCESOS } });

    const { result } = renderHook(() => useProcessCache());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.processes).toHaveLength(2);

    const moreProcesos: Proceso[] = [
      ...PROCESOS,
      { proceso: 103, nombre: 'Code Review' },
    ];
    mockApiClientPost.mockResolvedValueOnce({ success: true, data: { success: true, data: moreProcesos } });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.processes).toHaveLength(3);
    expect(mockApiClientPost).toHaveBeenCalledTimes(2);
  });

  it('cachea la lista recibida para poder usarla sin conexión', async () => {
    mockWizardGet.mockReturnValue({ usuario: 'MG01' });
    mockApiClientPost.mockResolvedValue({ success: true, data: { success: true, data: PROCESOS } });

    const { result } = renderHook(() => useProcessCache());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockStorage.upsertProcesos).toHaveBeenCalledWith(PROCESOS);
    expect(result.current.offline).toBe(false);
  });

  it('sin conexión cae a la caché local y marca offline sin tapar la pantalla con error', async () => {
    mockWizardGet.mockReturnValue({ usuario: 'MG01' });
    mockApiClientPost.mockRejectedValue(new Error('Network failure'));
    mockStorage.getAllProcesos.mockResolvedValue(PROCESOS);

    const { result } = renderHook(() => useProcessCache());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.offline).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.processes.map((p) => p.proceso)).toEqual([101, 102]);
  });

  it('mezcla las tareas locales pendientes al principio', async () => {
    mockWizardGet.mockReturnValue({ usuario: 'MG01' });
    mockApiClientPost.mockRejectedValue(new Error('Network failure'));
    mockStorage.getLocalProcesses.mockResolvedValue([
      {
        proceso: -1,
        nombre: 'Tarea sin conexión',
        dto: {
          nombre: 'Tarea sin conexión',
          fechaInicio: '01/06/2026',
          fechaFin: '02/06/2026',
          fechaEstimacion: '02/06/2026',
          minutos: 60,
          usuario: 'MG01',
          fase: 'DES',
        },
        creadoEn: '2026-06-01T09:00:00.000Z',
      },
    ]);

    const { result } = renderHook(() => useProcessCache());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.processes[0]).toMatchObject({ proceso: -1, pendiente: true });
    expect(result.current.offline).toBe(true);
  });
});
