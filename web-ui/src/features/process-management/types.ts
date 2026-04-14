/**
 * Types for Process Management feature
 * This feature handles the creation and management of processes (tareas) in the intranet.
 */

/**
 * Represents a process/task extracted from time entries
 */
export interface Process {
  name: string;
  fechaInicio: string; // ISO date string
  fechaFin: string;    // ISO date string
  totalMinutes: number;
}

/**
 * Parameters for generating SQL to create a process
 */
export interface ProcessCreationParams {
  nombre: string;
  fechaInicio: string; // DD/MM/YYYY format
  fechaFin: string;    // DD/MM/YYYY format
  minutos: number;
  usuario: string;
  fase?: string | null;
  cliente?: string;
  tipoHora?: number;
  presencial?: number;
  disponible?: number;
}

/**
 * Validation result for process ID
 */
export interface ProcessIdValidation {
  valid: boolean;
  error: string | null;
}

/**
 * Time entry from Clockify or similar source
 */
export interface TimeEntry {
  taskName?: string;
  task?: { name: string };
  timeInterval?: {
    start: string;
    end: string;
    duration: string | number;
  };
}

/**
 * Mapping from task name to process ID
 */
export type TaskProcessMapping = Record<string, string>;

/**
 * Process with additional computed data for display
 */
export interface ProcessWithDisplay extends Process {
  fechaInicioFormatted: string;
  fechaFinFormatted: string;
  hours: number;
}

/**
 * Filter type for process list
 */
export type ProcessFilterType = 'all' | 'assigned' | 'unassigned';

/**
 * Configuration for process creation
 */
export interface ProcessConfig {
  usuario: string;
  fase: string;
  tipoHora: string;
}
