const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Devuelve true si la caché supera el umbral de frescura configurado.
 * - Si lastUpdated es null (nunca se sincronizó) → considera stale
 * - thresholdDays se clamp a [1, 30] por defensiva, pero el caller ya debe validar
 */
export function isCacheStale(
  lastUpdated: number | null,
  thresholdDays: number,
  now: number = Date.now()
): boolean {
  if (lastUpdated == null) return true;
  const ageMs = now - lastUpdated;
  if (ageMs <= 0) return false;
  const thresholdMs = thresholdDays * MS_PER_DAY;
  return ageMs > thresholdMs;
}

/** Días completos transcurridos desde lastUpdated. null si nunca. */
export function getCacheAgeDays(
  lastUpdated: number | null,
  now: number = Date.now()
): number | null {
  if (lastUpdated == null) return null;
  const diff = now - lastUpdated;
  if (diff <= 0) return 0;
  return Math.floor(diff / MS_PER_DAY);
}

/** Formatea un timestamp ms a string legible. null/0 → "—" / "Nunca" */
export function formatLastUpdated(lastUpdated: number | null): string {
  if (lastUpdated == null) return 'Nunca';
  try {
    const d = new Date(lastUpdated);
    if (Number.isNaN(d.getTime())) return 'Nunca';
    return d.toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return 'Nunca';
  }
}

export { MS_PER_DAY };
