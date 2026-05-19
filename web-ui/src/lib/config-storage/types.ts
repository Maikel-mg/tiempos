/**
 * Type definitions for the Configuration Storage Module
 * 
 * Provides schema-driven, type-safe configuration storage with
 * transparent encryption and pluggable backends.
 */

/**
 * Supported field types for configuration values
 */
export type FieldType = 'string' | 'number' | 'boolean' | 'object';

/**
 * Field definition for schema-driven configuration
 * @template T The type of the field value
 */
export interface FieldDef<T> {
  /** The type of the field (used for validation and serialization) */
  type?: FieldType;
  /** Default value when not present in storage */
  default?: T;
  /** Whether to encrypt this field before storing */
  encrypted?: boolean;
}

/**
 * Schema definition for a configuration namespace
 * Maps keys to their field definitions
 * @template T The configuration object type
 */
export type ConfigSchema<T extends Record<string, unknown>> = {
  [K in keyof T]: FieldDef<T[K]>;
};

/**
 * Storage backend interface
 * Abstracts the underlying storage mechanism (localStorage, memory, etc.)
 */
export interface StorageBackend {
  /** Retrieve a value by key */
  getItem(key: string): string | null;
  /** Store a value by key */
  setItem(key: string, value: string): void;
  /** Remove a value by key */
  removeItem(key: string): void;
}

/**
 * Configuration store interface
 * Provides typed access to configuration values with subscription support
 * @template T The configuration object type
 */
export interface ConfigStore<T extends Record<string, unknown>> {
  /** Get the current configuration values */
  get(): T | null;
  /** Update configuration values (partial merge) */
  set(values: Partial<T>): void;
  /** Reset to schema defaults */
  reset(): void;
  /** Subscribe to configuration changes */
  subscribe(callback: (value: T) => void): () => void;
  /** Create a new store instance with a different backend */
  withBackend(backend: StorageBackend): ConfigStore<T>;
}

/**
 * Internal storage data structure
 */
export interface StoredConfig<T> {
  /** Schema version for migration support */
  version: number;
  /** Timestamp of last update */
  updatedAt: number;
  /** The actual configuration values */
  data: Partial<T>;
}

/**
 * Change event detail for subscriptions
 */
export interface ConfigChangeEvent<T> {
  /** Previous configuration values */
  previous: T;
  /** Current configuration values */
  current: T;
  /** Keys that changed */
  changedKeys: (keyof T)[];
}
