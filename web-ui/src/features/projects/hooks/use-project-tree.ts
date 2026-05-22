import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { ProjectTreeResponse, ProjectTreeParams, ProjectTreeRequest } from '../types';
import { dbConfig } from '@/config/stores';

export function useProjectTree(params: ProjectTreeParams) {
  return useQuery({
    queryKey: ['project-tree', params.codCli, params.proyecto],
    queryFn: async () => {
      const config = dbConfig.get();
      if (!config) {
        throw new Error('No se encontró configuración de base de datos');
      }

      const request: ProjectTreeRequest = {
        server: config.server,
        database: config.database,
        username: config.username,
        password: config.password || '',
        codCli: params.codCli.toString(),
        proyecto: params.proyecto.toString(),
      };

      const response = await apiClient.post<{
        success: boolean;
        message: string;
        data: { success: boolean; message: string; data: ProjectTreeResponse };
      }>('/projects-tree', request);

      if (!response.success) {
        throw new Error(response.message);
      }

      return response.data;
    },
    enabled: !!params.codCli && !!params.proyecto,
  });
}