/**
 * Configuration Storage Module - Public API
 * 
 * A type-safe, schema-driven configuration storage system with:
 * - Transparent encryption for sensitive fields
 * - Pluggable backends (localStorage, memory)
 * - Subscription-based change notifications
 * - Error recovery and default value handling
 * 
 * @example
 * ```typescript
 * import { defineConfig, createMemoryBackend } from '@/lib/config-storage';
 * 
 * // Define configuration schema
 * const dbConfig = defineConfig('database', {
 *   host: { type: 'string', default: 'localhost' },
 *   port: { type: 'number', default: 5432 },
 *   password: { type: 'string', encrypted: true }
 * });
 * 
 * // Get configuration (returns typed object)
 * const config = dbConfig.get();
 * 
 * // Update configuration (partial merge)
 * dbConfig.set({ host: 'prod.db.com' });
 * 
 * // Subscribe to changes
 * const unsubscribe = dbConfig.subscribe((newConfig) => {
 *   console.log('Config changed:', newConfig);
 * });
 * 
 * // Use memory backend for testing
 * const testConfig = dbConfig.withBackend(createMemoryBackend());
 * ```
 */

// Core functionality
export { defineConfig } from './ConfigStore';
export { createMemoryBackend, createLoggingMemoryBackend } from './backends/memory';
export { createLocalStorageBackend, createPrefixedLocalStorageBackend } from './backends/localStorage';

// Encryption utilities (for advanced use cases)
export { encode, decode, encodeValue, decodeValue, isEncoded } from './encryption';

// Type exports
export type {
  ConfigSchema,
  ConfigStore,
  StorageBackend,
  FieldDef,
  FieldType,
  StoredConfig,
  ConfigChangeEvent
} from './types';
