import { defineConfig } from '@/lib/config-storage';

/**
 * Database configuration store with password encryption
 * Used for SQL Server connection settings
 */
export const dbConfig = defineConfig('db', {
  server: { type: 'string', default: '' },
  database: { type: 'string', default: '' },
  username: { type: 'string', default: '' },
  password: { type: 'string', default: '', encrypted: true }
});

/**
 * Task mappings configuration store
 * Stores the mapping between task names and task IDs
 */
export const taskConfig = defineConfig('tasks', {
  mappings: { type: 'object', default: {} as Record<string, string> }
});

/**
 * Wizard/import configuration store
 * Stores user preferences for the import wizard
 */
export const wizardConfig = defineConfig('wizard', {
  usuario: { type: 'string', default: '' },
  fase: { type: 'string', default: '' },
  tipoHora: { type: 'string', default: '11' },
  encoding: { type: 'string', default: 'utf8' }
});

/**
 * UI state configuration store
 * Stores UI preferences like sidebar state
 */
export const uiConfig = defineConfig('ui', {
  sidebarOpen: { type: 'boolean', default: true }
});

/**
 * Phase by month configuration store
 * Stores fase suggestions by month for the import wizard
 */
export const phaseByMonthConfig = defineConfig('phase-by-month', {
  phases: { type: 'object', default: {} as Record<string, string> }
});
