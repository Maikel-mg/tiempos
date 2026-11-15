/**
 * Fecha → `YYYY-MM-DD` en hora local. Fuente única de conversión:
 * `toISOString().slice(0, 10)` devuelve el día en UTC y desalinea el rango del período.
 */
export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
