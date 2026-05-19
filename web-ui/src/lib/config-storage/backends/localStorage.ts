/**
 * localStorage backend for the Configuration Storage Module
 * 
 * Implements the StorageBackend interface using browser's localStorage.
 * This is the default backend for production use.
 */

import type { StorageBackend } from '../types';

/**
 * Create a localStorage-based storage backend
 * 
 * @returns StorageBackend implementation using localStorage
 * @throws Error if localStorage is not available (e.g., in SSR contexts)
 */
export function createLocalStorageBackend(): StorageBackend {
  if (typeof window === 'undefined' || !window.localStorage) {
    throw new Error('localStorage is not available. Use createMemoryBackend for SSR or testing.');
  }
  
  return {
    getItem(key: string): string | null {
      try {
        return window.localStorage.getItem(key);
      } catch (error) {
        // Handle quota exceeded or private mode errors
        console.warn(`Failed to read from localStorage: ${key}`, error);
        return null;
      }
    },
    
    setItem(key: string, value: string): void {
      try {
        window.localStorage.setItem(key, value);
      } catch (error) {
        // Handle quota exceeded or private mode errors
        console.warn(`Failed to write to localStorage: ${key}`, error);
      }
    },
    
    removeItem(key: string): void {
      try {
        window.localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove from localStorage: ${key}`, error);
      }
    }
  };
}

/**
 * Create a localStorage backend with a key prefix
 * Useful for isolating different applications on the same domain
 * 
 * @param prefix The prefix to add to all keys
 * @returns StorageBackend with prefixed keys
 */
export function createPrefixedLocalStorageBackend(prefix: string): StorageBackend {
  const base = createLocalStorageBackend();
  
  return {
    getItem(key: string): string | null {
      return base.getItem(`${prefix}${key}`);
    },
    
    setItem(key: string, value: string): void {
      base.setItem(`${prefix}${key}`, value);
    },
    
    removeItem(key: string): void {
      base.removeItem(`${prefix}${key}`);
    }
  };
}
