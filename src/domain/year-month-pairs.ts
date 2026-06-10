export interface YearMonthPair {
  year: number;
  month: number;
}

/**
 * Date range variant: generates all year-month pairs between start and end dates (inclusive).
 * Used by validate-entries.
 */
export function getYearMonthPairs(start: string, end: string): YearMonthPair[];
/**
 * Entry array variant: extracts unique year-month pairs from the `date` field of each item.
 * Used by sync-time-entries.
 */
export function getYearMonthPairs(items: { date: string }[]): YearMonthPair[];
export function getYearMonthPairs(arg1: string | { date: string }[], arg2?: string): YearMonthPair[] {
  if (Array.isArray(arg1)) {
    // Entry array variant
    const seen = new Set<string>();
    const pairs: YearMonthPair[] = [];
    for (const entry of arg1) {
      const [y, m] = entry.date.split('-');
      const key = `${y}-${m}`;
      if (!seen.has(key)) {
        seen.add(key);
        pairs.push({ year: parseInt(y, 10), month: parseInt(m, 10) });
      }
    }
    return pairs;
  }

  // Date range variant
  const start = arg1;
  const end = arg2!;
  const pairs: YearMonthPair[] = [];
  let current = new Date(start);
  const stop = new Date(end);

  while (current <= stop) {
    pairs.push({ year: current.getFullYear(), month: current.getMonth() + 1 });
    current.setMonth(current.getMonth() + 1);
  }
  return pairs;
}
