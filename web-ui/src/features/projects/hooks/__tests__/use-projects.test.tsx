import { renderHook, waitFor } from '@testing-library/react';
import { useProjects } from '../use-projects';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { dbConfig } from '@/config/stores';
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

vi.mock('@/config/stores', () => ({
  dbConfig: {
    get: vi.fn(),
  },
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
    vi.mocked(dbConfig.get).mockReturnValue(null);
  });

  it('should fetch projects successfully', async () => {
    const mockDbConfig = {
      server: 'localhost',
      database: 'test-db',
      username: 'sa',
      password: 'password123',
    };

    vi.mocked(dbConfig.get).mockReturnValue(mockDbConfig);

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

    // apiClient wraps the server body: { success, data: <serverBody> }, and the
    // /projects endpoint answers { success, data: Project[] }.
    vi.mocked(apiClient.post).mockResolvedValue({
      success: true,
      data: { success: true, data: mockProjects },
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
    vi.mocked(dbConfig.get).mockReturnValue({
      server: 'localhost',
      database: 'test-db',
      username: 'sa',
      password: 'pass',
    });

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
    // dbConfig.get() returns null (set in beforeEach)
    const { result } = renderHook(() => useProjects(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('No se encontró configuración');
  });

  it('should pass custom params to the API', async () => {
    vi.mocked(dbConfig.get).mockReturnValue({
      server: 'localhost',
      database: 'test-db',
      username: 'sa',
      password: 'pass',
    });

    vi.mocked(apiClient.post).mockResolvedValue({
      success: true,
      data: { success: true, data: [] },
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
