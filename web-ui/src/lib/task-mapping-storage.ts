import { taskConfig } from '@/config/stores';

export interface TaskMappings {
  [taskName: string]: string;
}

export function loadMappings(): TaskMappings {
  try {
    const config = taskConfig.get();
    if (config?.mappings) {
      return config.mappings;
    }
  } catch (error) {
    console.warn('Failed to load task mappings:', error);
  }
  return {};
}

export function saveMappings(newMappings: TaskMappings): boolean {
  try {
    const existing = loadMappings();
    const merged = { ...existing, ...newMappings };
    taskConfig.set({ mappings: merged });
    return true;
  } catch (error) {
    console.warn('Failed to save task mappings:', error);
    return false;
  }
}

export function updateMapping(taskName: string, taskId: string): void {
  const mappings = loadMappings();
  if (taskId && taskId.trim() !== '') {
    mappings[taskName] = taskId;
    saveMappings(mappings);
  }
}

export function findMappingByExactName(taskName: string): string | null {
  const mappings = loadMappings();
  return mappings[taskName] || null;
}

export function findMappingBySanitizedName(taskName: string): string | null {
  const mappings = loadMappings();
  const sanitizedInput = taskName.toLowerCase().trim();
  
  for (const [storedName, storedId] of Object.entries(mappings)) {
    const sanitizedStored = storedName.toLowerCase().trim();
    if (sanitizedStored === sanitizedInput) {
      return storedId;
    }
  }
  return null;
}

export function findSuggestedMapping(taskName: string): string | null {
  let suggestedId = findMappingByExactName(taskName);
  
  if (!suggestedId) {
    suggestedId = findMappingBySanitizedName(taskName);
  }
  
  return suggestedId;
}

export function getAllMappings(): TaskMappings {
  return loadMappings();
}
