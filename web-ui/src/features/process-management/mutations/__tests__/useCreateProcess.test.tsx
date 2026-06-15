import { renderHook, waitFor } from '@testing-library/react';
import { useCreateProcess } from '../useCreateProcess';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { dbConfig } from '@/config/stores';
import type { CreateProcessDTO } from '../../types';

// Mock the apiClient and dbConfig
vi.mock('@/lib/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
  default: {
    post: vi.fn(),
  }
}));

vi.mock('@/config/stores', () => ({
  dbConfig: {
    get: vi.fn(),
  }
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const validDTO: CreateProcessDTO = {
  nombre: 'Test Task',
  fechaInicio: '01/06/2026',
  fechaFin: '08/06/2026',
  fechaEstimacion: '01/06/2026',
  minutos: 120,
  usuario: 'MG01',
  fase: '100',
};

describe('useCreateProcess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    queryClient.clear();
    vi.mocked(dbConfig.get).mockReturnValue(null);
  });

  it('should create process successfully via DTO', async () => {
    const mockDbConfig = {
      server: 'localhost\\SQLEXPRESS',
      database: 'TiemposDB',
      username: 'sa',
      password: 'password123',
    };

    vi.mocked(dbConfig.get).mockReturnValue(mockDbConfig);

    vi.mocked(apiClient.post).mockResolvedValue({
      success: true,
      data: {
        success: true,
        message: 'Proceso creado exitosamente',
        totalRowsAffected: 1,
      },
    });

    const { result } = renderHook(() => useCreateProcess(), { wrapper });

    const response = await result.current.mutateAsync(validDTO);

    expect(response.success).toBe(true);
    expect(response.totalRowsAffected).toBe(1);
    expect(apiClient.post).toHaveBeenCalledWith('/create-process', {
      server: mockDbConfig.server,
      database: mockDbConfig.database,
      username: mockDbConfig.username,
      password: mockDbConfig.password,
      dto: validDTO,
    });
  });

  it('should handle API error response', async () => {
    const mockDbConfig = {
      server: 'localhost',
      database: 'test-db',
      username: 'sa',
      password: 'pass',
    };

    vi.mocked(dbConfig.get).mockReturnValue(mockDbConfig);

    vi.mocked(apiClient.post).mockResolvedValue({
      success: false,
      message: 'Error al crear el proceso',
    });

    const { result } = renderHook(() => useCreateProcess(), { wrapper });

    const mutationPromise = result.current.mutateAsync(validDTO);

    await waitFor(() => expect(result.current.isError).toBe(true));

    await expect(mutationPromise).rejects.toThrow('Error al crear el proceso');

    expect(result.current.error?.message).toBe('Error al crear el proceso');
  });

  it('should throw descriptive error when dbConfig is missing', async () => {
    vi.mocked(dbConfig.get).mockReturnValue(null);

    const { result } = renderHook(() => useCreateProcess(), { wrapper });

    await expect(result.current.mutateAsync(validDTO)).rejects.toThrow(
      'No se encontró configuración de base de datos. Configure las credenciales en la página de conexión.'
    );
  });

  it('should throw descriptive error when required fields are missing', async () => {
    vi.mocked(dbConfig.get).mockReturnValue({
      server: 'localhost',
      database: '',
      username: 'sa',
      password: 'pass',
    });

    const { result } = renderHook(() => useCreateProcess(), { wrapper });

    await expect(result.current.mutateAsync(validDTO)).rejects.toThrow(
      'Configuración de base de datos incompleta. Debe completar: servidor, base de datos y usuario.'
    );
  });

  it('should use empty string for password if not provided in config', async () => {
    const mockDbConfig = {
      server: 'localhost',
      database: 'test-db',
      username: 'sa',
      password: '',
    };

    vi.mocked(dbConfig.get).mockReturnValue(mockDbConfig);

    vi.mocked(apiClient.post).mockResolvedValue({
      success: true,
      data: {
        success: true,
        message: 'OK',
      },
    });

    const { result } = renderHook(() => useCreateProcess(), { wrapper });

    await result.current.mutateAsync(validDTO);

    expect(apiClient.post).toHaveBeenCalledWith('/create-process', {
      server: mockDbConfig.server,
      database: mockDbConfig.database,
      username: mockDbConfig.username,
      password: '',
      dto: validDTO,
    });
  });
});
