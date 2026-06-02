import { apiClient } from '@/lib/api/client';
import type { SyncValidationRequest, SyncValidationResult, SyncValidationError } from './types';

export type { SyncValidationRequest, SyncValidationResult, SyncValidationError } from './types';

/**
 * Validates time entries against the database before syncing.
 * Never throws — returns a typed error object on any failure.
 */
export async function validateSync(
  request: SyncValidationRequest,
): Promise<SyncValidationResult | SyncValidationError> {
  const { dbConfig, entries, usuario } = request;

  try {
    const result = await apiClient.post<SyncValidationResult>('/sync-time-entries', {
      ...dbConfig,
      entries,
      usuario,
    });

    if (result.success) {
      return result.data;
    }

    return { success: false, message: result.message };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, message };
  }
}
