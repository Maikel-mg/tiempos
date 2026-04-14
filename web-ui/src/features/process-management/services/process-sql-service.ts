/**
 * ProcessSQLService - Pure logic for generating SQL to create processes
 * 
 * This service handles the generation of SQL statements for creating
 * new processes (tareas) in the intranet database.
 * 
 * Uses the shared sql-generator from @/lib/sql-generator but wraps it
 * with domain-specific logic for process creation.
 */

import { generateTaskSQL, copyToClipboard as copyToClipboardUtil } from '@/lib/sql-generator';
import type { ProcessCreationParams } from '../types';

/**
 * Service for generating SQL related to process creation
 */
export class ProcessSQLService {
  /**
   * Generate SQL for creating a new process
   */
  generateCreateSQL(params: ProcessCreationParams): string {
    return generateTaskSQL(params);
  }

  /**
   * Copy SQL to clipboard
   */
  async copyToClipboard(sql: string): Promise<boolean> {
    return copyToClipboardUtil(sql);
  }

  /**
   * Format ISO date to DD/MM/YYYY format for SQL
   */
  formatDateToDDMMYYYY(isoDate: string | undefined | null): string {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Convert minutes to hours (rounded)
   */
  minutesToHours(minutes: number): number {
    return Math.round(minutes / 60 * 10) / 10;
  }
}

// Singleton instance for convenience
export const processSQLService = new ProcessSQLService();
