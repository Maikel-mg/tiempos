import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { dbConfig, wizardConfig } from '@/config/stores';
import type { Marcaje } from '../lib/marcajes';

/**
 * Marcajes de la intranet del período visible. Solo se piden cuando el popup
 * está abierto (`enabled`): sin VPN la Agenda tiene que seguir funcionando.
 */
export function useMarcajes({ days, enabled }: { days: string[]; enabled: boolean }) {
  const from = days[0];
  const to = days[days.length - 1];

  return useQuery<Marcaje[]>({
    queryKey: ['marcajes', from, to],
    enabled: enabled && Boolean(from && to),
    // Los marcajes de un día pasado ya no cambian; los de hoy, sí.
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const config = dbConfig.get();
      if (!config?.server || !config?.database) {
        throw new Error('Falta la configuración de la base de datos');
      }
      const usured = wizardConfig.get()?.usuario ?? '';
      if (!usured) {
        throw new Error('Falta el usuario en Configuración');
      }

      const response = await apiClient.post<{ success: boolean; data: Marcaje[]; message?: string }>('/marcajes', {
        server: config.server,
        database: config.database,
        username: config.username,
        password: config.password || '',
        startDate: from,
        endDate: to,
        usured,
      });

      if (!response.success) {
        throw new Error(response.message);
      }
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'No se pudieron leer los marcajes');
      }
      return response.data.data ?? [];
    },
  });
}
