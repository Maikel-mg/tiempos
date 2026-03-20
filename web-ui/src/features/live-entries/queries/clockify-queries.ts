import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { TimeEntry } from '@/lib/types';

export interface ClockifyReportParams {
  startDate: string;
  endDate: string;
}

export interface ClockifyReportResponse {
  success: boolean;
  count: number;
  data: TimeEntry[];
  error?: string;
}

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

export function useClockifyReport(params: ClockifyReportParams) {
  return useQuery<ClockifyReportResponse, Error>({
    queryKey: ['clockify-report', params.startDate, params.endDate],
    queryFn: async () => {
      const startIso = `${params.startDate}T00:00:00Z`;
      const endIso = `${params.endDate}T23:59:59Z`;
      const result = await apiClient.post<ClockifyReportResponse>('/clockify/report', {
        startDate: startIso,
        endDate: endIso
      });
      if (result.success) return result.data;
      throw new Error(result.message || 'Error al obtener datos de Clockify');
    },
    staleTime: 5 * 60 * 1000,
    retry: 1
  });
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
