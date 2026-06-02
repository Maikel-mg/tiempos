import { apiClient } from '@/lib/api/client';
import { dbConfig } from '@/config/stores';

/**
 * Adapter that unwraps the ApiClient response for ProcessCacheRepository.
 * ProcessCacheRepository expects post<T>() to return the raw T,
 * but the real ApiClient wraps it in { success, data }.
 *
 * Also injects DB config into /projects-tree requests since the endpoint
 * requires server/database/username/password in the body.
 */
export const processCacheClient = {
  async post<T>(url: string, data?: unknown): Promise<T> {
    // The /projects-tree endpoint needs DB config in the body
    const payload = url === '/projects-tree'
      ? { ...dbConfig.get(), ...(data as object) }
      : data;

    const response = await apiClient.post<T>(url, payload);
    if (!response.success) {
      throw new Error(response.message);
    }
    return response.data;
  },
};
