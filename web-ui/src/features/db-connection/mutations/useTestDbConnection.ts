import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { ExecuteSqlParams, TestConnectionResult } from '@/lib/types';

type TestConnectionParams = Omit<ExecuteSqlParams, 'sqlStatements'>;

export function useTestDbConnection() {
  return useMutation<TestConnectionResult, Error, TestConnectionParams>({
    mutationFn: async (params) => {
      const result = await apiClient.post<TestConnectionResult>('/test-connection', params);
      if (result.success) return result.data;
      throw new Error(result.message);
    }
  });
}
