import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { ClockifyReportResponse } from '@/features/live-entries/queries/clockify-queries';

export interface UseTimeEntriesParams {
  startDate: string;
  endDate: string;
}

export function useTimeEntries(params: UseTimeEntriesParams) {
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
