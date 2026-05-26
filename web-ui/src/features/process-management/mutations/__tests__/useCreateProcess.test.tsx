import { renderHook, waitFor } from '@testing-library/react';
import { useCreateProcess } from '../useCreateProcess';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { dbConfig } from '@/config/stores';

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

describe('useCreateProcess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    queryClient.clear();
    vi.mocked(dbConfig.get).mockReturnValue(null);
  });

  it('should execute SQL successfully', async () => {
    const mockSql = 'INSERT INTO procesos (id, nombre) VALUES (1, \'Test\')';
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
        message: 'SQL ejecutado exitosamente',
        totalRowsAffected: 1,
      },
    });

    const { result } = renderHook(() => useCreateProcess(), { wrapper });

    // Call mutateAsync to trigger the mutation
    const response = await result.current.mutateAsync(mockSql);

    expect(response.success).toBe(true);
    expect(response.totalRowsAffected).toBe(1);
    expect(apiClient.post).toHaveBeenCalledWith('/execute-sql', {
      server: mockDbConfig.server,
      database: mockDbConfig.database,
      username: mockDbConfig.username,
      password: mockDbConfig.password,
      sqlStatements: [mockSql],
    });
  });

  it('should handle API error response', async () => {
    const mockSql = 'INVALID SQL';
    const mockDbConfig = {
      server: 'localhost',
      database: 'test-db',
      username: 'sa',
      password: 'pass',
    };

    vi.mocked(dbConfig.get).mockReturnValue(mockDbConfig);

    vi.mocked(apiClient.post).mockResolvedValue({
      success: false,
      message: 'Error en la consulta SQL',
    });

    const { result } = renderHook(() => useCreateProcess(), { wrapper });

    // Start the mutation and capture the promise
    const mutationPromise = result.current.mutateAsync(mockSql);

    // Wait for the error state to be set
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Verify the promise rejected with the correct message
    await expect(mutationPromise).rejects.toThrow('Error en la consulta SQL');

    // Verify error message is set correctly
    expect(result.current.error?.message).toBe('Error en la consulta SQL');
  });

  it('should throw descriptive error when dbConfig is missing', async () => {
    const mockSql = 'INSERT INTO test VALUES (1)';

    // dbConfig.get returns null (no config saved or error)
    vi.mocked(dbConfig.get).mockReturnValue(null);

    const { result } = renderHook(() => useCreateProcess(), { wrapper });

    await expect(result.current.mutateAsync(mockSql)).rejects.toThrow(
      'No se encontró configuración de base de datos. Configure las credenciales en la página de conexión.'
    );
  });

  it('should throw descriptive error when required fields are missing', async () => {
    const mockSql = 'INSERT INTO test VALUES (1)';

    // Missing database field (empty string)
    vi.mocked(dbConfig.get).mockReturnValue({
      server: 'localhost',
      database: '',
      username: 'sa',
      password: 'pass',
    });

    const { result } = renderHook(() => useCreateProcess(), { wrapper });

    await expect(result.current.mutateAsync(mockSql)).rejects.toThrow(
      'Configuración de base de datos incompleta. Debe completar: servidor, base de datos y usuario.'
    );
  });

  it('should use empty string for password if not provided in config', async () => {
    const mockSql = 'INSERT INTO test VALUES (1)';
    // Config with empty password (default case)
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

    await result.current.mutateAsync(mockSql);

    expect(apiClient.post).toHaveBeenCalledWith('/execute-sql', {
      server: mockDbConfig.server,
      database: mockDbConfig.database,
      username: mockDbConfig.username,
      password: '',
      sqlStatements: [mockSql],
    });
  });
});
