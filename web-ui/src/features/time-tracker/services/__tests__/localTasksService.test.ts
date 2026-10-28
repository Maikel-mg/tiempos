import { describe, it, expect, vi, beforeEach } from 'vitest';
import { materializeLocalTasks, saveLocalTask, toProceso } from '../localTasksService';
import type { LocalProcess } from '../../types';

const { mockStorage, mockPost, mockDbGet } = vi.hoisted(() => ({
  mockStorage: {
    getLocalProcesses: vi.fn(),
    saveLocalProcess: vi.fn(async () => {}),
    deleteLocalProcess: vi.fn(async () => {}),
    remapTaskId: vi.fn(async () => 0),
    upsertProceso: vi.fn(async () => {}),
  },
  mockPost: vi.fn(),
  mockDbGet: vi.fn(() => ({ server: 'srv', database: 'db', username: 'u', password: 'p' })),
}));

vi.mock('@/lib/storage/IndexedDBStorage', () => ({ indexedDBStorage: mockStorage }));
vi.mock('@/lib/api/client', () => ({ apiClient: { post: (...args: unknown[]) => mockPost(...args) } }));
vi.mock('@/config/stores', () => ({ dbConfig: { get: () => mockDbGet() } }));

const DTO = {
  nombre: 'Tarea offline',
  fechaInicio: '01/06/2026',
  fechaFin: '02/06/2026',
  fechaEstimacion: '02/06/2026',
  minutos: 60,
  usuario: 'MG01',
  fase: 'DES',
};

function local(overrides: Partial<LocalProcess> = {}): LocalProcess {
  return { proceso: -1, nombre: 'Tarea offline', dto: DTO, creadoEn: '2026-06-01T09:00:00Z', ...overrides };
}

describe('localTasksService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saveLocalTask usa ids negativos decrecientes', async () => {
    mockStorage.getLocalProcesses.mockResolvedValue([local({ proceso: -3 })]);

    const proceso = await saveLocalTask(DTO);

    expect(proceso).toMatchObject({ proceso: -4, nombre: 'Tarea offline', pendiente: true });
    expect(mockStorage.saveLocalProcess).toHaveBeenCalledWith(
      expect.objectContaining({ proceso: -4, dto: DTO })
    );
  });

  it('toProceso marca la tarea como pendiente y la deja visible en el departamento propio', () => {
    expect(toProceso(local())).toMatchObject({ proceso: -1, pendiente: true, departamentoId: 5 });
  });

  it('materializeLocalTasks crea la tarea, reapunta los Registros y borra la copia local', async () => {
    mockStorage.getLocalProcesses.mockResolvedValue([local()]);
    mockPost.mockResolvedValue({ success: true, data: { success: true, resultado: '4242' } });
    mockStorage.remapTaskId.mockResolvedValue(2);

    const result = await materializeLocalTasks();

    expect(mockPost).toHaveBeenCalledWith('/create-process', expect.objectContaining({ dto: DTO }));
    expect(mockStorage.remapTaskId).toHaveBeenCalledWith(
      -1,
      expect.objectContaining({ proceso: 4242, nombre: 'Tarea offline' })
    );
    expect(mockStorage.deleteLocalProcess).toHaveBeenCalledWith(-1);
    expect(result).toEqual({ creadas: 1, movidos: 2, fallidas: [] });
  });

  it('si el SP no devuelve id, conserva la tarea en local y la reporta como fallida', async () => {
    mockStorage.getLocalProcesses.mockResolvedValue([local()]);
    mockPost.mockResolvedValue({ success: true, data: { success: true, resultado: null } });

    const result = await materializeLocalTasks();

    expect(result.creadas).toBe(0);
    expect(result.fallidas).toHaveLength(1);
    expect(mockStorage.deleteLocalProcess).not.toHaveBeenCalled();
    expect(mockStorage.remapTaskId).not.toHaveBeenCalled();
  });

  it('si la llamada falla, reporta el error del backend', async () => {
    mockStorage.getLocalProcesses.mockResolvedValue([local()]);
    mockPost.mockResolvedValue({ success: false, message: 'Fase inválida' });

    const result = await materializeLocalTasks();

    expect(result.fallidas).toEqual([{ nombre: 'Tarea offline', error: 'Fase inválida' }]);
  });
});
