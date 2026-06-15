// Process Management Feature
// 
// This feature handles the creation and management of processes (tareas) in the intranet.
// It provides:
// - Process extraction from time entries
// - Process ID validation and mapping
// - SQL generation for process creation
// - UI components for process mapping

// Types
export type {
  Process,
  ProcessCreationParams,
  ProcessIdValidation,
  TimeEntry,
  TaskProcessMapping,
  ProcessWithDisplay,
  ProcessFilterType,
  ProcessConfig,
  CreateProcessDTO
} from './types';

// Services (pure logic, no React)
export {
  processSQLService,
  ProcessSQLService,
  processExtractor,
  ProcessExtractorService,
  processValidation,
  ProcessValidationService
} from './services';

// Hooks (React state management)
export { useProcessManagement } from './hooks';
export type { UseProcessManagementReturn, UseProcessManagementOptions } from './hooks';

// Components (UI layer)
export { ProcessMappingTable, ProcessSelector } from './components';
export type { ProcessMappingTableProps, ProcessSelectorProps } from './components';
