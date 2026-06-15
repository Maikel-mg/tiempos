/**
 * ProcessSQLService - Pure logic for process creation utilities
 * 
 * SQL generation has been moved to the backend (sp-builder.ts).
 * This service retains helper utilities for formatting and clipboard.
 */

import { copyToClipboard as copyToClipboardUtil } from '@/lib/sql-utils';

/**
 * Service for process creation utilities
 */
export class ProcessSQLService {
  /**
   * Copy SQL to clipboard
   */
  async copyToClipboard(sql: string): Promise<boolean> {
    return copyToClipboardUtil(sql);
  }

  /**
   * Format ISO date to DD/MM/YYYY format
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
