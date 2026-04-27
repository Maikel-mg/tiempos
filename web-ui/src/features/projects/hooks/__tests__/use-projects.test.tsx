import { renderHook, waitFor } from '@testing-library/react';
import { useProjects } from '../use-projects';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
  default: {
    post: vi.fn(),
  }
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    queryClient.clear();
  });

  it('should fetch projects successfully', async () => {
    const mockDbConfig = {
      server: 'localhost',
      database: 'test-db',
      username: 'sa',
      password: 'password123',
    };
    
    // Encrypt password as done in DBConnection
    const encryptedConfig = {
      ...mockDbConfig,
      password: btoa(mockDbConfig.password),
    };
    
    localStorage.setItem('db_connection_config', JSON.stringify(encryptedConfig));

    const mockProjects = [
      { 
        CodCli: '1', 
        NomCliente: 'Client 1', 
        NomProy: 'Project 1', 
        Proyecto: 'P1', 
        NomDpto: 'D1', 
        Abierto: true, 
        UsuredRespRev: 'User 1',
        Cliente: 'Client 1',
        IdDpto: 'D1',
        IdAplicacion: 'App1'
      },
    ];

    vi.mocked(apiClient.post).mockResolvedValue({
      success: true,
      data: mockProjects,
    });

    const { result } = renderHook(() => useProjects(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockProjects);
    expect(apiClient.post).toHaveBeenCalledWith('/projects', expect.objectContaining({
      server: mockDbConfig.server,
      database: mockDbConfig.database,
      username: mockDbConfig.username,
      password: mockDbConfig.password,
    }));
  });

  it('should handle error when API fails', async () => {
    localStorage.setItem('db_connection_config', JSON.stringify({
      server: 'localhost',
      database: 'test-db',
      username: 'sa',
      password: btoa('pass')
    }));

    vi.mocked(apiClient.post).mockResolvedValue({
      success: false,
      message: 'API Error',
    });

    const { result } = renderHook(() => useProjects(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
    expect(result.current.error?.message).toBe('API Error');
  });

  it('should return error if no DB config is found', async () => {
    const { result } = renderHook(() => useProjects(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('No se encontró configuración');
  });

  it('should pass custom params to the API', async () => {
    localStorage.setItem('db_connection_config', JSON.stringify({
      server: 'localhost',
      database: 'test-db',
      username: 'sa',
      password: btoa('pass')
    }));

    vi.mocked(apiClient.post).mockResolvedValue({
      success: true,
      data: [],
    });

    const customParams = {
      fecha: '2023-01-01',
      modoProc: 'CUSTOM',
      usured: 'USER123',
    };

    const { result } = renderHook(() => useProjects(customParams), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiClient.post).toHaveBeenCalledWith('/projects', expect.objectContaining(customParams));
  });
});
