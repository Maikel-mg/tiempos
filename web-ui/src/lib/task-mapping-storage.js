const STORAGE_KEY = 'persistent_task_mappings';

export function loadMappings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load task mappings from localStorage:', error);
  }
  return {};
}

export function saveMappings(newMappings) {
  try {
    const existing = loadMappings();
    const merged = { ...existing, ...newMappings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return true;
  } catch (error) {
    console.warn('Failed to save task mappings to localStorage:', error);
    return false;
  }
}

export function updateMapping(taskName, taskId) {
  const mappings = loadMappings();
  if (taskId && taskId.trim() !== '') {
    mappings[taskName] = taskId;
    saveMappings(mappings);
  }
}

export function findMappingByExactName(taskName) {
  const mappings = loadMappings();
  return mappings[taskName] || null;
}

export function findMappingBySanitizedName(taskName) {
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

export function findSuggestedMapping(taskName) {
  let suggestedId = findMappingByExactName(taskName);
  
  if (!suggestedId) {
    suggestedId = findMappingBySanitizedName(taskName);
  }
  
  return suggestedId;
}

export function getAllMappings() {
  return loadMappings();
}
