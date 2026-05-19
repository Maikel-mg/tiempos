import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { Project, ProjectsParams, ProjectsRequest } from '../types';
import { dbConfig } from '@/config/stores';

export function useProjects(params: ProjectsParams = {}) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: async () => {
      const config = dbConfig.get();
      if (!config) {
        throw new Error('No se encontró configuración de base de datos');
      }

      const request: ProjectsRequest = {
        server: config.server,
        database: config.database,
        username: config.username,
        password: config.password || '',
        fecha: params.fecha || new Date().toISOString().split('T')[0],
        modoProc: params.modoProc || '',
        usured: params.usured || '',
      };

      const response = await apiClient.post<{success: boolean , message: string; data : {success: boolean; message: string; data: Project[]}}>('/projects', request);
      console.log(`TCL ~ useProjects ~ response:`, response.data.data)
      
      if (!response.success) {
        throw new Error(response.message);
      }

      return response.data?.data;
    },
  });
}
