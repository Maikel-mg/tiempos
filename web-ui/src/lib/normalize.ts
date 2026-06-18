/**
 * Normaliza un string para comparación insensible a mayúsculas, espacios y diacríticos.
 * Usado para agrupar descripciones de entradas que el usuario puede escribir con
 * variaciones de capitalización, espacios extra o acentos.
 */
export function normalizeForMatch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar diacríticos
    .replace(/\s+/g, ' ');           // colapsar espacios múltiples
}
