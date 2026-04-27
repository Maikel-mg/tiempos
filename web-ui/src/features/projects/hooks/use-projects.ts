import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { Project, ProjectsParams, ProjectsRequest } from '../types';

function decryptPassword(encoded: string): string {
    try {
        return atob(encoded);
    } catch {
        return '';
    }
}

const STORAGE_KEY = 'db_connection_config';

export function useProjects(params: ProjectsParams = {}) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: async () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        throw new Error('No se encontró configuración de base de datos');
      }

      const dbConfig = JSON.parse(saved);
      const request: ProjectsRequest = {
        server: dbConfig.server,
        database: dbConfig.database,
        username: dbConfig.username,
        password: dbConfig.password ? decryptPassword(dbConfig.password) : '',
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
