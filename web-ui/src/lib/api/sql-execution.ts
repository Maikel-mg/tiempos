import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export interface ExecuteSqlParams {
  server: string;
  database: string;
  username: string;
  password?: string;
  sqlStatements: string[];
}

export interface ExecuteSqlResponse {
  success: boolean;
  message: string;
  totalRowsAffected?: number;
  results?: { success: boolean; rowsAffected: number }[];
}

export function useTestConnection() {
  return useQuery({
    queryKey: ['db-health'],
    queryFn: async () => {
      const result = await apiClient.get<{ status: string }>('/health');
      if (result.success) return result.data;
      throw new Error(result.message);
    },
    retry: 1,
    enabled: false
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
