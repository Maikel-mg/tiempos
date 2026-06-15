import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { dbConfig } from '@/config/stores';
import type { CreateProcessDTO } from '../types';
import type { ExecuteSqlResponse } from '../../live-entries/queries/clockify-queries';

/**
 * Mutation hook to create a process via the /api/create-process endpoint.
 * Sends a DTO with form data; the backend generates and executes the INSERT SQL.
 */
export function useCreateProcess() {
  return useMutation<ExecuteSqlResponse, Error, CreateProcessDTO>({
    mutationFn: async (dto: CreateProcessDTO) => {
      // Get database configuration from store
      const config = dbConfig.get();

      // Validate required configuration fields
      if (!config) {
        throw new Error('No se encontró configuración de base de datos. Configure las credenciales en la página de conexión.');
      }

      const { server, database, username, password } = config;

      if (!server || !database || !username) {
        throw new Error('Configuración de base de datos incompleta. Debe completar: servidor, base de datos y usuario.');
      }

      // Execute via dedicated endpoint
      const result = await apiClient.post<ExecuteSqlResponse>('/create-process', {
        server,
        database,
        username,
        password: password || '',
        dto,
      });

      if (result.success) {
        return result.data;
      }

      throw new Error(result.message || 'Error al crear el proceso');
    }
  });
}
