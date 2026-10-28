import { describe, it, expect, vi, beforeEach } from 'vitest';
import { materializeLocalTask, saveLocalTask, toProceso } from '../localTasksService';
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

  it('materializeLocalTask crea la tarea con la fase elegida, reapunta los Registros y borra la copia local', async () => {
    mockStorage.getLocalProcesses.mockResolvedValue([local()]);
    mockPost.mockResolvedValue({ success: true, data: { success: true, resultado: '4242' } });
    mockStorage.remapTaskId.mockResolvedValue(2);

    const result = await materializeLocalTask(-1, 'DES');

    expect(mockPost).toHaveBeenCalledWith(
      '/create-process',
      expect.objectContaining({ dto: { ...DTO, fase: 'DES' } })
    );
    expect(mockStorage.remapTaskId).toHaveBeenCalledWith(
      -1,
      expect.objectContaining({ proceso: 4242, nombre: 'Tarea offline' })
    );
    expect(mockStorage.deleteLocalProcess).toHaveBeenCalledWith(-1);
    expect(result).toEqual({ movidos: 2 });
  });

  it('si el SP no devuelve id, lanza y conserva la tarea en local', async () => {
    mockStorage.getLocalProcesses.mockResolvedValue([local()]);
    mockPost.mockResolvedValue({ success: true, data: { success: true, resultado: null } });

    await expect(materializeLocalTask(-1, 'DES')).rejects.toThrow(
      'El SP no devolvió el id de la tarea creada'
    );
    expect(mockStorage.deleteLocalProcess).not.toHaveBeenCalled();
    expect(mockStorage.remapTaskId).not.toHaveBeenCalled();
  });

  it('si la llamada falla, propaga el mensaje del backend', async () => {
    mockStorage.getLocalProcesses.mockResolvedValue([local()]);
    mockPost.mockResolvedValue({ success: false, message: 'Fase inválida' });

    await expect(materializeLocalTask(-1, 'XXX')).rejects.toThrow('Fase inválida');
  });

  it('si la tarea local ya no existe, no llama al backend', async () => {
    mockStorage.getLocalProcesses.mockResolvedValue([]);

    await expect(materializeLocalTask(-9, 'DES')).rejects.toThrow(
      'La tarea pendiente ya no existe en este equipo'
    );
    expect(mockPost).not.toHaveBeenCalled();
  });
});
