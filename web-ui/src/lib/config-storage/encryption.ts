/**
 * Encryption utilities for the Configuration Storage Module
 * 
 * Currently uses base64 encoding for basic obfuscation.
 * Can be extended to use AES or other encryption algorithms.
 */

/**
 * Encode a string to base64 with unicode support
 * Uses encodeURIComponent to handle non-ASCII characters
 * @param value The string to encode
 * @returns Base64 encoded string
 */
export function encode(value: string): string {
  // Use encodeURIComponent to handle unicode, then convert to base64
  const utf8Bytes = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, hex) => 
    String.fromCharCode(parseInt(hex, 16))
  );
  
  if (typeof window === 'undefined') {
    // Node.js environment (tests)
    return Buffer.from(utf8Bytes, 'binary').toString('base64');
  }
  // Browser environment - btoa only supports latin1, so we need the utf8Bytes conversion
  return btoa(utf8Bytes);
}

/**
 * Decode a base64 string with unicode support
 * @param value The base64 string to decode
 * @returns Decoded string
 * @throws Error if the value is not valid base64
 */
export function decode(value: string): string {
  let latin1String: string;
  
  if (typeof window === 'undefined') {
    // Node.js environment (tests)
    latin1String = Buffer.from(value, 'base64').toString('binary');
  } else {
    // Browser environment
    latin1String = atob(value);
  }
  
  // Convert latin1 back to utf-8
  return decodeURIComponent(
    latin1String.split('').map(char => 
      '%' + char.charCodeAt(0).toString(16).padStart(2, '0')
    ).join('')
  );
}

/**
 * Check if a value appears to be encoded (base64)
 * @param value The value to check
 * @returns True if the value looks like base64
 */
export function isEncoded(value: string): boolean {
  // Basic base64 pattern check
  const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
  return base64Pattern.test(value) && value.length % 4 === 0 && value.length > 0;
}

/**
 * Encode a configuration value based on its type
 * @param value The value to encode
 * @param type The field type
 * @returns Encoded string
 */
export function encodeValue(value: unknown, type: FieldType): string {
  const stringValue = serializeValue(value, type);
  return encode(stringValue);
}

/**
 * Decode a configuration value based on its type
 * @param encodedValue The encoded string
 * @param type The field type
 * @returns Decoded value
 */
export function decodeValue(encodedValue: string, type: FieldType): unknown {
  const decoded = decode(encodedValue);
  return deserializeValue(decoded, type);
}

/**
 * Serialize a value to string based on its type
 */
function serializeValue(value: unknown, type: FieldType): string {
  switch (type) {
    case 'string':
      return String(value);
    case 'number':
      return String(value);
    case 'boolean':
      return String(value);
    case 'object':
      return JSON.stringify(value);
    default:
      return String(value);
  }
}

/**
 * Deserialize a string value based on its type
 */
function deserializeValue(value: string, type: FieldType): unknown {
  switch (type) {
    case 'string':
      return value;
    case 'number':
      return Number(value);
    case 'boolean':
      return value === 'true';
    case 'object':
      return JSON.parse(value);
    default:
      return value;
  }
}

// Import FieldType for the functions above
import type { FieldType } from './types';
