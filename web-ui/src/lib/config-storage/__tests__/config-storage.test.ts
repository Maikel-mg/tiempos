/**
 * Boundary tests for the Configuration Storage Module
 * 
 * Tests cover:
 * - Encryption/decryption of sensitive fields
 * - Default value application
 * - Subscription callbacks
 * - Error recovery (corrupted storage)
 * - Backend injection (memory backend for testing)
 */

import { describe, test, expect, beforeEach } from 'vitest';
import {
  defineConfig,
  createMemoryBackend,
  encode
} from '../index';

/**
 * Test schema with various field types and encryption settings
 */
interface TestConfig extends Record<string, unknown> {
  username: string;
  password: string;
  port: number;
  enabled: boolean;
  settings: Record<string, unknown>;
}

const testSchema = {
  username: { type: 'string' as const, default: 'admin' },
  password: { type: 'string' as const, encrypted: true },
  port: { type: 'number' as const, default: 3000 },
  enabled: { type: 'boolean' as const, default: false },
  settings: { type: 'object' as const, default: {} }
};

describe('Configuration Storage Module', () => {
  
  describe('Type Inference', () => {
    
    test('defineConfig infers types from schema', () => {
      const store = defineConfig('test-types', {
        name: { type: 'string', default: 'Anonymous' },
        age: { type: 'number', default: 0 },
        active: { type: 'boolean', default: true }
      }, createMemoryBackend());
      
      const config = store.get();
      
      // TypeScript should infer these types - if it compiles, types are correct
      expect(config?.name).toBe('Anonymous');
      expect(config?.age).toBe(0);
      expect(config?.active).toBe(true);
      
      // Update with correct types (would fail TypeScript if wrong)
      store.set({ name: 'John', age: 25, active: false });
      
      const updated = store.get();
      expect(updated?.name).toBe('John');
      expect(updated?.age).toBe(25);
      expect(updated?.active).toBe(false);
    });
    
    test('partial updates work with type inference', () => {
      const store = defineConfig('test-partial', {
        host: { type: 'string', default: 'localhost' },
        port: { type: 'number', default: 8080 }
      }, createMemoryBackend());
      
      store.set({ port: 9000 });
      
      const config = store.get();
      expect(config?.host).toBe('localhost'); // Default preserved
      expect(config?.port).toBe(9000); // Updated
    });
  });

  describe('Encryption', () => {
    let memoryBackend: ReturnType<typeof createMemoryBackend>;
    
    beforeEach(() => {
      memoryBackend = createMemoryBackend();
    });
    
    test('password is encrypted when stored', () => {
      const store = defineConfig('test-encryption', testSchema, memoryBackend);
      
      const sensitiveData = 'secretPassword123';
      store.set({ password: sensitiveData });
      
      // Read raw storage
      const rawStorage = memoryBackend.getItem('config:test-encryption');
      expect(rawStorage).not.toBeNull();
      
      const parsed = JSON.parse(rawStorage!);
      const storedPassword = parsed.data.password;
      
      // Stored value should be base64 encoded, not plaintext
      expect(storedPassword).not.toBe(sensitiveData);
      expect(storedPassword).toBe(encode(sensitiveData));
    });
    
    test('password is transparently decrypted when retrieved', () => {
      const store = defineConfig('test-decryption', testSchema, memoryBackend);
      
      const sensitiveData = 'mySecretPassword';
      store.set({ password: sensitiveData });
      
      // Get should return decrypted value
      const config = store.get();
      expect(config?.password).toBe(sensitiveData);
    });
    
    test('non-encrypted fields are stored as plaintext', () => {
      const store = defineConfig('test-plaintext', testSchema, memoryBackend);
      
      store.set({ username: 'john_doe' });
      
      const rawStorage = memoryBackend.getItem('config:test-plaintext');
      const parsed = JSON.parse(rawStorage!);
      
      // Username should not be encoded
      expect(parsed.data.username).toBe('john_doe');
    });
    
    test('mixed encrypted and plaintext fields', () => {
      const store = defineConfig('test-mixed', testSchema, memoryBackend);
      
      store.set({ 
        username: 'admin',
        password: 'secret',
        port: 5432 
      });
      
      const rawStorage = memoryBackend.getItem('config:test-mixed');
      const parsed = JSON.parse(rawStorage!);
      
      // Username and port should be plaintext
      expect(parsed.data.username).toBe('admin');
      expect(parsed.data.port).toBe(5432);
      
      // Password should be encoded
      expect(parsed.data.password).toBe(encode('secret'));
    });
    
    test('empty password works with encryption', () => {
      const store = defineConfig('test-empty-pass', testSchema, memoryBackend);
      
      store.set({ password: '' });
      
      const config = store.get();
      expect(config?.password).toBe('');
    });
  });

  describe('Default Values', () => {
    
    test('defaults are applied when no stored value', () => {
      const store = defineConfig('test-defaults', testSchema, createMemoryBackend());
      
      const config = store.get();
      
      expect(config).not.toBeNull();
      expect(config?.username).toBe('admin');
      expect(config?.port).toBe(3000);
      expect(config?.enabled).toBe(false);
      expect(config?.settings).toEqual({});
    });
    
    test('defaults are merged with stored values', () => {
      const backend = createMemoryBackend();
      const store = defineConfig('test-merge', testSchema, backend);
      
      store.set({ username: 'custom_user' });
      
      const config = store.get();
      expect(config?.username).toBe('custom_user');
      expect(config?.port).toBe(3000); // Default preserved
      expect(config?.enabled).toBe(false); // Default preserved
    });
    
    test('defaults are reapplied after reset', () => {
      const store = defineConfig('test-reset-defaults', testSchema, createMemoryBackend());
      
      store.set({ username: 'modified', port: 9999 });
      store.reset();
      
      const config = store.get();
      expect(config?.username).toBe('admin');
      expect(config?.port).toBe(3000);
    });
    
    test('object defaults are properly cloned', () => {
      const store = defineConfig('test-obj-defaults', testSchema, createMemoryBackend());
      
      const config1 = store.get();
      const config2 = store.get();
      
      // Each get should return independent objects
      expect(config1?.settings).toEqual(config2?.settings);
      expect(config1?.settings).not.toBe(config2?.settings);
    });
  });

  describe('Subscriptions', () => {
    
    test('callback is fired on set', () => {
      const store = defineConfig('test-sub', testSchema, createMemoryBackend());
      const callbacks: Array<{ username: string; port: number }> = [];
      
      store.subscribe((config) => {
        callbacks.push({ username: (config as TestConfig).username, port: (config as TestConfig).port });
      });
      
      store.set({ username: 'user1' });
      
      expect(callbacks).toHaveLength(1);
      expect(callbacks[0].username).toBe('user1');
    });
    
    test('callback receives full config on change', () => {
      const store = defineConfig('test-sub-full', testSchema, createMemoryBackend());
      let receivedPort: number | undefined;
      let receivedUsername: string | undefined;
      
      store.subscribe((config) => {
        receivedPort = (config as TestConfig).port;
        receivedUsername = (config as TestConfig).username;
      });
      
      store.set({ port: 8080 });
      
      expect(receivedPort).toBe(8080);
      expect(receivedUsername).toBe('admin'); // Default included
    });
    
    test('multiple subscribers all receive updates', () => {
      const store = defineConfig('test-multi-sub', testSchema, createMemoryBackend());
      const callbacks1: string[] = [];
      const callbacks2: number[] = [];
      
      store.subscribe((config) => callbacks1.push((config as TestConfig).username));
      store.subscribe((config) => callbacks2.push((config as TestConfig).port));
      
      store.set({ username: 'test', port: 1234 });
      
      expect(callbacks1).toEqual(['test']);
      expect(callbacks2).toEqual([1234]);
    });
    
    test('unsubscribe stops receiving updates', () => {
      const store = defineConfig('test-unsub', testSchema, createMemoryBackend());
      const callbacks: string[] = [];
      
      const unsubscribe = store.subscribe((config) => {
        callbacks.push(config.username);
      });
      
      store.set({ username: 'first' });
      unsubscribe();
      store.set({ username: 'second' });
      
      expect(callbacks).toEqual(['first']);
    });
    
    test('subscription survives get() returning null', () => {
      const store = defineConfig('test-sub-null', testSchema, createMemoryBackend());
      let callbackCount = 0;
      
      store.subscribe(() => {
        callbackCount++;
      });
      
      // First set should trigger callback
      store.set({ username: 'test' });
      
      expect(callbackCount).toBe(1);
    });
  });

  describe('Error Recovery', () => {
    let memoryBackend: ReturnType<typeof createMemoryBackend>;
    
    beforeEach(() => {
      memoryBackend = createMemoryBackend();
    });
    
    test('returns null on corrupted JSON', () => {
      memoryBackend.setItem('config:test-corrupt', 'not valid json');
      
      const store = defineConfig('test-corrupt', testSchema, memoryBackend);
      const config = store.get();
      
      expect(config).toBeNull();
    });
    
    test('returns null on invalid storage structure', () => {
      memoryBackend.setItem('config:test-invalid', JSON.stringify({ 
        notData: 'wrong structure' 
      }));
      
      const store = defineConfig('test-invalid', testSchema, memoryBackend);
      const config = store.get();
      
      expect(config).toBeNull();
    });
    
    test('fresh start after null read', () => {
      memoryBackend.setItem('config:test-fresh', 'invalid json');
      
      const store = defineConfig('test-fresh', testSchema, memoryBackend);
      
      // First get returns null due to error
      expect(store.get()).toBeNull();
      
      // But set still works and subsequent get returns values
      store.set({ username: 'recovered' });
      const config = store.get();
      
      expect(config?.username).toBe('recovered');
    });
    
    test('handles missing encrypted field gracefully', () => {
      const store = defineConfig('test-missing-enc', testSchema, memoryBackend);
      
      // Set only non-encrypted fields
      store.set({ username: 'user' });
      
      const config = store.get();
      expect(config?.username).toBe('user');
      expect(config?.password).toBeUndefined();
    });
  });

  describe('Backend Injection', () => {
    
    test('memory backend isolates data', () => {
      const backend1 = createMemoryBackend();
      const backend2 = createMemoryBackend();
      
      const store1 = defineConfig('isolated', testSchema, backend1);
      const store2 = defineConfig('isolated', testSchema, backend2);
      
      store1.set({ username: 'store1' });
      store2.set({ username: 'store2' });
      
      expect(store1.get()?.username).toBe('store1');
      expect(store2.get()?.username).toBe('store2');
    });
    
    test('withBackend creates independent store', () => {
      const backend1 = createMemoryBackend();
      const backend2 = createMemoryBackend();
      
      const store1 = defineConfig('shared', testSchema, backend1);
      store1.set({ username: 'original' });
      
      const store2 = store1.withBackend(backend2);
      store2.set({ username: 'different' });
      
      // Original store should not see changes to new backend
      expect(store1.get()?.username).toBe('original');
      expect(store2.get()?.username).toBe('different');
    });
    
    test('memory backend provides raw access', () => {
      const backend = createMemoryBackend();
      const store = defineConfig('raw-access', testSchema, backend);
      
      store.set({ username: 'test' });
      
      // Direct backend access
      const raw = backend.getItem('config:raw-access');
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!).data.username).toBe('test');
    });
    
    test('memory backend removeItem works', () => {
      const backend = createMemoryBackend();
      const store = defineConfig('remove-test', testSchema, backend);
      
      store.set({ username: 'exists' });
      expect(store.get()?.username).toBe('exists');
      
      backend.removeItem('config:remove-test');
      
      // After removal, should return defaults
      const config = store.get();
      expect(config?.username).toBe('admin');
    });
  });

  describe('Reset', () => {
    
    test('reset clears all values and applies defaults', () => {
      const store = defineConfig('test-reset', testSchema, createMemoryBackend());
      
      store.set({ 
        username: 'modified',
        password: 'secret',
        port: 9999,
        enabled: true 
      });
      
      store.reset();
      
      const config = store.get();
      expect(config?.username).toBe('admin');
      expect(config?.password).toBeUndefined();
      expect(config?.port).toBe(3000);
      expect(config?.enabled).toBe(false);
    });
    
    test('reset triggers subscription callbacks', () => {
      const store = defineConfig('test-reset-sub', testSchema, createMemoryBackend());
      let callbackCount = 0;
      
      store.subscribe(() => {
        callbackCount++;
      });
      
      store.set({ username: 'test' });
      store.reset();
      
      expect(callbackCount).toBe(2); // Once for set, once for reset
    });
  });

  describe('Namespace Isolation', () => {
    
    test('different namespaces do not interfere', () => {
      const backend = createMemoryBackend();
      
      const storeA = defineConfig('namespace-a', {
        value: { type: 'string', default: 'A' }
      }, backend);
      
      const storeB = defineConfig('namespace-b', {
        value: { type: 'string', default: 'B' }
      }, backend);
      
      storeA.set({ value: 'modified-a' });
      
      expect(storeA.get()?.value).toBe('modified-a');
      expect(storeB.get()?.value).toBe('B');
    });
    
    test('storage key uses config: prefix', () => {
      const backend = createMemoryBackend();
      
      defineConfig('key-test', {
        data: { type: 'string' }
      }, backend).set({ data: 'value' });
      
      // Check the actual key used in storage
      const stored = backend.getItem('config:key-test');
      expect(stored).not.toBeNull();
    });
  });

  describe('Edge Cases', () => {
    
    test('handles special characters in strings', () => {
      const store = defineConfig('test-special', {
        text: { type: 'string', encrypted: true }
      }, createMemoryBackend());
      
      const specialChars = 'Hello "World" <script>alert("xss")</script> \n\t';
      store.set({ text: specialChars });
      
      const config = store.get();
      expect(config?.text).toBe(specialChars);
    });
    
    test('handles unicode characters', () => {
      const store = defineConfig('test-unicode', {
        text: { type: 'string', encrypted: true }
      }, createMemoryBackend());
      
      const unicode = 'Héllo 世界 🌍 Ñoño';
      store.set({ text: unicode });
      
      const config = store.get();
      expect(config?.text).toBe(unicode);
    });
    
    test('handles empty object default', () => {
      const store = defineConfig('test-empty-obj', {
        data: { type: 'object', default: {} }
      }, createMemoryBackend());
      
      const config = store.get();
      expect(config?.data).toEqual({});
    });
    
    test('handles nested object updates', () => {
      const store = defineConfig('test-nested', {
        config: { type: 'object', default: { a: 1, b: 2 } }
      }, createMemoryBackend());
      
      store.set({ config: { a: 10, b: 20 } });
      
      const retrieved = store.get();
      expect(retrieved?.config).toEqual({ a: 10, b: 20 });
    });
    
    test('handles very long encrypted values', () => {
      const store = defineConfig('test-long', {
        token: { type: 'string', encrypted: true }
      }, createMemoryBackend());
      
      const longToken = 'a'.repeat(1000);
      store.set({ token: longToken });
      
      const config = store.get();
      expect(config?.token).toBe(longToken);
    });
    
    test('concurrent updates from different stores on same backend', () => {
      const backend = createMemoryBackend();
      const store1 = defineConfig('concurrent', {
        value: { type: 'number', default: 0 }
      }, backend);
      
      const store2 = defineConfig('concurrent', {
        value: { type: 'number', default: 0 }
      }, backend);
      
      store1.set({ value: 100 });
      store2.set({ value: 200 });
      
      // Both should see the last value
      expect(store1.get()?.value).toBe(200);
      expect(store2.get()?.value).toBe(200);
    });
  });
});
