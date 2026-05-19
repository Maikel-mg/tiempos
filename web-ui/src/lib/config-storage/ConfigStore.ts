/**
 * Core ConfigStore implementation
 * 
 * Provides schema-driven configuration management with:
 * - Type-safe access
 * - Transparent encryption for sensitive fields
 * - Default value handling
 * - Error recovery
 * - Subscription-based change notifications
 */

import type {
  ConfigSchema,
  ConfigStore,
  StorageBackend,
  FieldType,
  StoredConfig
} from './types';
import { encodeValue, decodeValue } from './encryption';
import { createLocalStorageBackend } from './backends/localStorage';
import { createMemoryBackend } from './backends/memory';

/**
 * Current storage format version
 * Increment when making breaking changes to the storage format
 */
const STORAGE_VERSION = 1;

/**
 * Prefix for storage keys
 */
const STORAGE_KEY_PREFIX = 'config:';

/**
 * Event name for configuration changes
 */
const CHANGE_EVENT = 'config:change';

/**
 * Default field type when not specified
 */
const DEFAULT_FIELD_TYPE: FieldType = 'string';

/**
 * ConfigStore implementation class
 * @template T The configuration object type
 */
class ConfigStoreImpl<T extends Record<string, unknown>> implements ConfigStore<T> {
  private namespace: string;
  private schema: ConfigSchema<T>;
  private backend: StorageBackend;
  private eventTarget: EventTarget;
  private storageKey: string;

  constructor(
    namespace: string,
    schema: ConfigSchema<T>,
    backend: StorageBackend,
    eventTarget?: EventTarget
  ) {
    this.namespace = namespace;
    this.schema = schema;
    this.backend = backend;
    this.eventTarget = eventTarget ?? new EventTarget();
    this.storageKey = `${STORAGE_KEY_PREFIX}${namespace}`;
  }

  /**
   * Get the current configuration values
   * Applies defaults and decrypts encrypted fields
   * @returns Current configuration or null on parse error
   */
  get(): T | null {
    try {
      const stored = this.backend.getItem(this.storageKey);
      
      if (stored === null) {
        // No stored value, return defaults only
        return this.applyDefaults({} as Partial<T>);
      }

      const parsed: StoredConfig<T> = JSON.parse(stored);
      
      // Validate storage structure
      if (!parsed || typeof parsed !== 'object' || !('data' in parsed)) {
        console.warn(`Invalid storage structure for ${this.namespace}`);
        return null;
      }
      
      // Check version for future migrations
      if (parsed.version !== STORAGE_VERSION) {
        console.warn(`Config version mismatch for ${this.namespace}: ${parsed.version} vs ${STORAGE_VERSION}`);
        // Could implement migration here
      }

      // Decrypt encrypted fields
      const decrypted = this.decryptValues(parsed.data);
      
      // Apply defaults for missing fields
      return this.applyDefaults(decrypted);
    } catch (error) {
      // Error recovery: return null on parse errors
      console.error(`Failed to read config ${this.namespace}:`, error);
      return null;
    }
  }

  /**
   * Update configuration values (partial merge)
   * Encrypts encrypted fields before storing
   * @param values Partial configuration values to update
   */
  set(values: Partial<T>): void {
    try {
      const current = this.get() ?? this.applyDefaults({} as Partial<T>);
      
      // Merge new values with current
      const merged = { ...current, ...values };
      
      // Encrypt sensitive fields
      const encrypted = this.encryptValues(merged);
      
      // Store with metadata
      const stored: StoredConfig<T> = {
        version: STORAGE_VERSION,
        updatedAt: Date.now(),
        data: encrypted
      };
      
      this.backend.setItem(this.storageKey, JSON.stringify(stored));
      
      // Notify subscribers
      this.notifyChange(current, merged, Object.keys(values) as (keyof T)[]);
    } catch (error) {
      console.error(`Failed to write config ${this.namespace}:`, error);
    }
  }

  /**
   * Reset to schema defaults
   * Clears all stored values and reapplies defaults
   */
  reset(): void {
    try {
      const previous = this.get();
      this.backend.removeItem(this.storageKey);
      const current = this.applyDefaults({} as Partial<T>);
      
      // Notify subscribers of all keys changing
      const allKeys = Object.keys(this.schema) as (keyof T)[];
      this.notifyChange(previous ?? current, current, allKeys);
    } catch (error) {
      console.error(`Failed to reset config ${this.namespace}:`, error);
    }
  }

  /**
   * Subscribe to configuration changes
   * @param callback Function to call when configuration changes
   * @returns Unsubscribe function
   */
  subscribe(callback: (value: T) => void): () => void {
    const handler = (_event: Event) => {
      const current = this.get();
      if (current !== null) {
        callback(current);
      }
    };

    this.eventTarget.addEventListener(CHANGE_EVENT, handler);

    // Return unsubscribe function
    return () => {
      this.eventTarget.removeEventListener(CHANGE_EVENT, handler);
    };
  }

  /**
   * Create a new store instance with a different backend
   * Shares the same event target for cross-backend notifications
   * @param backend New storage backend to use
   * @returns New ConfigStore instance
   */
  withBackend(backend: StorageBackend): ConfigStore<T> {
    return new ConfigStoreImpl(this.namespace, this.schema, backend, this.eventTarget);
  }

  /**
   * Apply default values from schema for missing fields
   */
  private applyDefaults(values: Partial<T>): T {
    const result = { ...values } as T;
    
    for (const key of Object.keys(this.schema) as (keyof T)[]) {
      const fieldDef = this.schema[key];
      if (result[key] === undefined && fieldDef.default !== undefined) {
        // Deep clone object defaults to prevent reference sharing
        if (fieldDef.type === 'object' && fieldDef.default !== null) {
          result[key] = JSON.parse(JSON.stringify(fieldDef.default)) as T[keyof T];
        } else {
          result[key] = fieldDef.default as T[keyof T];
        }
      }
    }
    
    return result;
  }

  /**
   * Encrypt values for fields marked as encrypted
   */
  private encryptValues(values: Partial<T>): Partial<T> {
    const result = { ...values };
    
    for (const key of Object.keys(this.schema) as (keyof T)[]) {
      const fieldDef = this.schema[key];
      
      if (fieldDef.encrypted && result[key] !== undefined) {
        const fieldType = fieldDef.type ?? DEFAULT_FIELD_TYPE;
        result[key] = encodeValue(result[key], fieldType) as T[keyof T];
      }
    }
    
    return result;
  }

  /**
   * Decrypt values for fields marked as encrypted
   */
  private decryptValues(values: Partial<T>): Partial<T> {
    const result = { ...values };
    
    for (const key of Object.keys(this.schema) as (keyof T)[]) {
      const fieldDef = this.schema[key];
      
      if (fieldDef.encrypted && result[key] !== undefined && typeof result[key] === 'string') {
        const fieldType = fieldDef.type ?? DEFAULT_FIELD_TYPE;
        try {
          result[key] = decodeValue(result[key] as string, fieldType) as T[keyof T];
        } catch (error) {
          console.warn(`Failed to decrypt field ${String(key)}:`, error);
          // Keep the original value on decryption failure
        }
      }
    }
    
    return result;
  }

  /**
   * Notify subscribers of configuration changes
   */
  private notifyChange(previous: T, current: T, changedKeys: (keyof T)[]): void {
    const event = new CustomEvent(CHANGE_EVENT, {
      detail: { previous, current, changedKeys }
    });
    this.eventTarget.dispatchEvent(event);
  }
}

/**
 * Create a new ConfigStore instance
 * Factory function for creating type-safe configuration stores
 * 
 * @param namespace Unique namespace for this configuration
 * @param schema Schema defining the configuration structure
 * @param backend Storage backend (defaults to localStorage)
 * @returns ConfigStore instance with type inference from schema
 * 
 * @example
 * ```typescript
 * const userConfig = defineConfig('user', {
 *   name: { type: 'string', default: 'Anonymous' },
 *   age: { type: 'number', default: 0 },
 *   password: { type: 'string', encrypted: true }
 * });
 * 
 * // TypeScript infers: { name: string; age: number; password: string }
 * const config = userConfig.get();
 * ```
 */
export function defineConfig<T extends Record<string, unknown>>(
  namespace: string,
  schema: ConfigSchema<T>,
  backend?: StorageBackend
): ConfigStore<T> {
  // Lazy-load localStorage backend if not provided
  const storageBackend = backend ?? getDefaultBackend();
  return new ConfigStoreImpl(namespace, schema, storageBackend);
}

/**
 * Get the default storage backend (localStorage with memory fallback)
 */
function getDefaultBackend(): StorageBackend {
  try {
    return createLocalStorageBackend();
  } catch {
    // Fallback to memory backend if localStorage unavailable
    return createMemoryBackend();
  }
}

// Re-export types for convenience
export type { ConfigSchema, ConfigStore, StorageBackend, FieldDef } from './types';
