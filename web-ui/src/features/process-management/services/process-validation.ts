/**
 * ProcessValidationService - Validation logic for processes
 */

import type { ProcessIdValidation } from '../types';

export class ProcessValidationService {
  /**
   * Validate a process ID
   * Must be a positive integer
   */
  validateProcessId(value: string): ProcessIdValidation {
    if (!value || value.trim() === '') {
      return { valid: false, error: 'Requerido' };
    }
    if (!/^[1-9]\d*$/.test(value)) {
      return { valid: false, error: 'Debe ser un número entero positivo' };
    }
    return { valid: true, error: null };
  }

  /**
   * Check if a process has a valid ID assigned
   */
  isProcessAssigned(taskMapping: Record<string, string>, processName: string): boolean {
    const id = taskMapping[processName];
    return id ? /^[1-9]\d*$/.test(id) : false;
  }

  /**
   * Count assigned processes
   */
  countAssigned(processes: { name: string }[], taskMapping: Record<string, string>): number {
    return processes.filter(p => this.isProcessAssigned(taskMapping, p.name)).length;
  }
}

// Singleton instance
export const processValidation = new ProcessValidationService();
