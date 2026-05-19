import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { ProjectTreeResponse, ProjectTreeParams, ProjectTreeRequest } from '../types';

function decryptPassword(encoded: string): string {
  try {
    return atob(encoded);
  } catch {
    return '';
  }
}

const STORAGE_KEY = 'db_connection_config';

export function useProjectTree(params: ProjectTreeParams) {
  return useQuery({
    queryKey: ['project-tree', params.codCli, params.proyecto],
    queryFn: async () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        throw new Error('No se encontró configuración de base de datos');
      }

      const dbConfig = JSON.parse(saved);
      const request: ProjectTreeRequest = {
        server: dbConfig.server,
        database: dbConfig.database,
        username: dbConfig.username,
        password: dbConfig.password ? decryptPassword(dbConfig.password) : '',
        codCli: params.codCli,
        proyecto: params.proyecto,
      };

      const response = await apiClient.post<{
        success: boolean;
        message: string;
        data: { success: boolean; message: string; data: ProjectTreeResponse };
      }>('/projects-tree', request);

      if (!response.success) {
        throw new Error(response.message);
      }

      return response.data?.data;
    },
    enabled: !!params.codCli && !!params.proyecto,
  });
}