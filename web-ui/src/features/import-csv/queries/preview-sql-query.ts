import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { BackendTimeEntry } from '../services/entry-converter';

export interface PreviewSqlPayload {
  entries: BackendTimeEntry[];
}

export interface PreviewSqlResponse {
  success: boolean;
  sql: string;
}

export function usePreviewSql(payload: PreviewSqlPayload, enabled: boolean) {
  return useQuery<PreviewSqlResponse, Error>({
    queryKey: ['preview-sql', payload],
    queryFn: async () => {
      const result = await apiClient.post<PreviewSqlResponse>('/preview-sql', payload);
      if (result.success) return result.data;
      throw new Error(result.message);
    },
    enabled,
    staleTime: Infinity,
  });
}
