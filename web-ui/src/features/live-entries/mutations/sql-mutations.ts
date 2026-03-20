import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { ExecuteSqlParams, ExecuteSqlResponse } from '../queries/clockify-queries';

export function useExecuteSql() {
  const queryClient = useQueryClient();

  return useMutation<ExecuteSqlResponse, Error, ExecuteSqlParams>({
    mutationFn: async (params) => {
      const result = await apiClient.post<ExecuteSqlResponse>('/execute-sql', params);
      if (result.success) return result.data;
      throw new Error(result.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clockify-report'] });
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
