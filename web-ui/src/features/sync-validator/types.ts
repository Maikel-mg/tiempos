import type { TimeEntry } from '@/lib/types';
import type { DbConfig } from '@/components/DBConnection';

export interface SyncValidationRequest {
  dbConfig: DbConfig;
  entries: TimeEntry[];
  usuario: string;
}

export interface SyncValidationResult {
  success: boolean;
  willInsert: TimeEntry[];
  alreadyExists: TimeEntry[];
}

export interface SyncValidationError {
  success: false;
  message: string;
  details?: string;
}
