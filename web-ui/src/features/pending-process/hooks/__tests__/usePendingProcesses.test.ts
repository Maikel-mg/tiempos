import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePendingProcesses } from '../usePendingProcesses';
import type { Proceso, ProcesoPendiente } from '@/features/time-tracker/types';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockWizardGet = vi.fn();
const mockGetPendingProcesses = vi.fn();
const mockGetPendingProcessesAsProcesos = vi.fn();
const mockCreatePendingProcess = vi.fn();
const mockUpdatePendingProcess = vi.fn();
const mockDeletePendingProcess = vi.fn();

vi.mock('@/features/time-tracker/services/ProcessOfflineService', () => ({
  processOfflineService: {
    getPendingProcesses: (...args: unknown[]) => mockGetPendingProcesses(...args),
    getPendingProcessesAsProcesos: (...args: unknown[]) => mockGetPendingProcessesAsProcesos(...args),
    createPendingProcess: (...args: unknown[]) => mockCreatePendingProcess(...args),
    updatePendingProcess: (...args: unknown[]) => mockUpdatePendingProcess(...args),
    deletePendingProcess: (...args: unknown[]) => mockDeletePendingProcess(...args),
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

function makePendiente(id: number, nombre: string): ProcesoPendiente {
  return {
    id,
    nombre,
    minutos: 60,
    createdAt: 1000,
    updatedAt: 1000,
  };
}

function makeAsProceso(id: number, nombre: string): Proceso {
  return { proceso: id, nombre, esPendiente: true, procesoPendienteId: id };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('usePendingProcesses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWizardGet.mockReturnValue({ usuario: 'MG01' });
    mockGetPendingProcesses.mockResolvedValue([]);
    mockGetPendingProcessesAsProcesos.mockResolvedValue([]);
  });

  it('loads pending processes and their Proceso projection on mount', async () => {
    const pendientes = [makePendiente(-1, 'Pendiente Uno')];
    const asProcesos = [makeAsProceso(-1, 'Pendiente Uno')];
    mockGetPendingProcesses.mockResolvedValue(pendientes);
    mockGetPendingProcessesAsProcesos.mockResolvedValue(asProcesos);

    const { result } = renderHook(() => usePendingProcesses());

    await waitFor(() => {
      expect(result.current.pendingProcesses).toHaveLength(1);
    });

    expect(result.current.pendingProcesos).toEqual(asProcesos);
    expect(mockGetPendingProcesses).toHaveBeenCalledWith('MG01');
    expect(mockGetPendingProcessesAsProcesos).toHaveBeenCalledWith('MG01');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns empty lists without calling the service when usuario is empty', async () => {
    mockWizardGet.mockReturnValue({ usuario: '' });

    const { result } = renderHook(() => usePendingProcesses());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.pendingProcesses).toEqual([]);
    expect(result.current.pendingProcesos).toEqual([]);
    expect(mockGetPendingProcesses).not.toHaveBeenCalled();
  });

  it('create calls the service and reloads the list', async () => {
    const created = makePendiente(-1, 'Nuevo Pendiente');
    mockCreatePendingProcess.mockResolvedValue(created);
    mockGetPendingProcesses.mockResolvedValue([created]);

    const { result } = renderHook(() => usePendingProcesses());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    let returned: ProcesoPendiente | undefined;
    await act(async () => {
      returned = await result.current.create({ nombre: 'Nuevo Pendiente', minutos: 30 });
    });

    expect(mockCreatePendingProcess).toHaveBeenCalledWith('MG01', { nombre: 'Nuevo Pendiente', minutos: 30 });
    expect(returned).toEqual(created);
    expect(result.current.pendingProcesses).toEqual([created]);
  });

  it('update calls the service with the patch', async () => {
    const updated = makePendiente(-1, 'Renombrado');
    mockUpdatePendingProcess.mockResolvedValue(updated);
    mockGetPendingProcesses.mockResolvedValue([updated]);

    const { result } = renderHook(() => usePendingProcesses());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.update(-1, { nombre: 'Renombrado' });
    });

    expect(mockUpdatePendingProcess).toHaveBeenCalledWith('MG01', -1, { nombre: 'Renombrado' });
    expect(result.current.pendingProcesses).toEqual([updated]);
  });

  it('remove calls the service and reloads', async () => {
    const { result } = renderHook(() => usePendingProcesses());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.remove(-1);
    });

    expect(mockDeletePendingProcess).toHaveBeenCalledWith('MG01', -1);
    expect(mockGetPendingProcesses).toHaveBeenCalledTimes(2);
  });

  it('sets error when the service throws', async () => {
    mockGetPendingProcesses.mockRejectedValue(new Error('Storage failure'));

    const { result } = renderHook(() => usePendingProcesses());

    await waitFor(() => {
      expect(result.current.error).toBe('Storage failure');
    });

    expect(result.current.pendingProcesses).toEqual([]);
    expect(result.current.loading).toBe(false);
  });
});
