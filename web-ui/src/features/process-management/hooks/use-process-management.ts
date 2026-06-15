/**
 * useProcessManagement - Hook for managing process creation and mapping
 * 
 * Encapsulates the business logic for:
 * - Extracting processes from time entries
 * - Validating process IDs
 * - Managing task-to-process mappings
 */

import { useState, useCallback, useMemo } from 'react';
import { processExtractor, processValidation } from '../services';
import { saveMappings } from '@/lib/task-mapping-storage';
import type { Process, ProcessIdValidation, ProcessFilterType, ProcessConfig, TimeEntry } from '../types';

export interface UseProcessManagementOptions {
  initialConfig?: Partial<ProcessConfig>;
}

export interface UseProcessManagementReturn {
  // State
  processes: Process[];
  taskMapping: Record<string, string>;
  localErrors: Record<string, string | null>;
  config: ProcessConfig;
  
  // Computed
  totalProcesses: number;
  assignedCount: number;
  unassignedCount: number;
  allAssigned: boolean;
  
  // Actions
  setEntries: (entries: TimeEntry[]) => void;
  updateProcessId: (processName: string, processId: string) => ProcessIdValidation;
  removeProcessIdError: (processName: string) => void;
  updateConfig: (key: keyof ProcessConfig, value: string) => void;
  
  // Filtering
  getFilteredProcesses: (filter: ProcessFilterType, searchTerm: string) => Process[];
}

const DEFAULT_CONFIG: ProcessConfig = {
  usuario: '',
  fase: '',
  tipoHora: '11'
};

export function useProcessManagement(options: UseProcessManagementOptions = {}): UseProcessManagementReturn {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [taskMapping, setTaskMapping] = useState<Record<string, string>>({});
  const [localErrors, setLocalErrors] = useState<Record<string, string | null>>({});
  const [config, setConfig] = useState<ProcessConfig>({
    ...DEFAULT_CONFIG,
    ...options.initialConfig
  });

  // Computed values
  const totalProcesses = processes.length;
  const assignedCount = useMemo(() => 
    processValidation.countAssigned(processes, taskMapping),
    [processes, taskMapping]
  );
  const unassignedCount = totalProcesses - assignedCount;
  const allAssigned = unassignedCount === 0 && totalProcesses > 0;

  // Extract processes from entries
  const setEntries = useCallback((entries: TimeEntry[]) => {
    const extracted = processExtractor.extractFromEntries(entries);
    setProcesses(extracted);
  }, []);

  // Update process ID with validation and persistence
  const updateProcessId = useCallback((processName: string, processId: string): ProcessIdValidation => {
    const validation = processValidation.validateProcessId(processId);
    
    // Update mapping
    setTaskMapping(prev => ({ ...prev, [processName]: processId }));
    
    // Update error state
    if (processId) {
      setLocalErrors(prev => ({ ...prev, [processName]: validation.error }));
    } else {
      setLocalErrors(prev => {
        const next = { ...prev };
        delete next[processName];
        return next;
      });
    }
    
    // Persist if valid
    if (validation.valid) {
      saveMappings({ [processName]: processId });
    }
    
    return validation;
  }, []);

  // Remove error for a process
  const removeProcessIdError = useCallback((processName: string) => {
    setLocalErrors(prev => {
      const next = { ...prev };
      delete next[processName];
      return next;
    });
  }, []);

  // Update config
  const updateConfig = useCallback((key: keyof ProcessConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  // Filter processes
  const getFilteredProcesses = useCallback((
    filter: ProcessFilterType, 
    searchTerm: string
  ): Process[] => {
    let filtered = processes;

    // Apply filter
    if (filter === 'assigned') {
      filtered = filtered.filter(p => processValidation.isProcessAssigned(taskMapping, p.name));
    } else if (filter === 'unassigned') {
      filtered = filtered.filter(p => !processValidation.isProcessAssigned(taskMapping, p.name));
    }

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [processes, taskMapping]);

  return {
    processes,
    taskMapping,
    localErrors,
    config,
    totalProcesses,
    assignedCount,
    unassignedCount,
    allAssigned,
    setEntries,
    updateProcessId,
    removeProcessIdError,
    updateConfig,
    getFilteredProcesses
  };
}
