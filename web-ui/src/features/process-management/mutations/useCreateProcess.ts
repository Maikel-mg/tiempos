import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { dbConfig } from '@/config/stores';
import type { ExecuteSqlResponse } from '../../live-entries/queries/clockify-queries';

/**
 * Mutation hook to execute SQL statements via the /api/execute-sql endpoint.
 * Reads DB configuration from the dbConfig store and executes the provided SQL.
 */
export function useCreateProcess() {
  return useMutation<ExecuteSqlResponse, Error, string>({
    mutationFn: async (sql: string) => {
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

      // Execute SQL via API
      const result = await apiClient.post<ExecuteSqlResponse>('/execute-sql', {
        server,
        database,
        username,
        password: password || '',
        sqlStatements: [sql]
      });

      if (result.success) {
        return result.data;
      }

      throw new Error(result.message || 'Error al ejecutar la consulta SQL');
    }
  });
}
