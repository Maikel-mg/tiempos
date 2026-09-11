import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { ExecuteSqlParams, ExecuteSqlResponse } from '@/lib/api/sql-execution';

export function useExecuteSql() {
  return useMutation<ExecuteSqlResponse, Error, ExecuteSqlParams>({
    mutationFn: async (params) => {
      const result = await apiClient.post<ExecuteSqlResponse>('/execute-sql', params);
      if (result.success) return result.data;
      throw new Error(result.message);
    }
  });
}

export function useTestDbConnection() {
  return useMutation<{ success: boolean; message: string }, Error, Omit<ExecuteSqlParams, 'sqlStatements'>>({
    mutationFn: async (params) => {
      const result = await apiClient.post<{ success: boolean; message: string }>('/test-connection', params);
      if (result.success) return result.data;
      throw new Error(result.message);
    }
  });
}
