/**
 * Memory-based storage backend for testing
 * 
 * Implements the StorageBackend interface using an in-memory Map.
 * Useful for unit tests where localStorage is not available or
 * should not be polluted.
 */

import type { StorageBackend } from '../types';

/**
 * Create a memory-based storage backend
 * @returns StorageBackend implementation backed by a Map
 */
export function createMemoryBackend(): StorageBackend {
  const storage = new Map<string, string>();
  
  return {
    getItem(key: string): string | null {
      return storage.get(key) ?? null;
    },
    
    setItem(key: string, value: string): void {
      storage.set(key, value);
    },
    
    removeItem(key: string): void {
      storage.delete(key);
    }
  };
}

/**
 * Create a memory backend that logs all operations (for debugging)
 * @returns StorageBackend with logging
 */
export function createLoggingMemoryBackend(): StorageBackend {
  const memory = createMemoryBackend();
  
  return {
    getItem(key: string): string | null {
      const value = memory.getItem(key);
      console.log(`[Storage] GET ${key}:`, value ? '***' : null);
      return value;
    },
    
    setItem(key: string, value: string): void {
      console.log(`[Storage] SET ${key}:`, value ? `(${value.length} chars)` : 'null');
      memory.setItem(key, value);
    },
    
    removeItem(key: string): void {
      console.log(`[Storage] DELETE ${key}`);
      memory.removeItem(key);
    }
  };
}
