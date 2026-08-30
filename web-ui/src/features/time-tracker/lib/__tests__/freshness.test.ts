import { describe, it, expect } from 'vitest';
import { isCacheStale, getCacheAgeDays, formatLastUpdated, MS_PER_DAY } from '../freshness';

describe('isCacheStale', () => {
  const NOW = new Date('2026-08-30T12:00:00Z').getTime();

  it('returns true when lastUpdated is null (never synced)', () => {
    expect(isCacheStale(null, 7, NOW)).toBe(true);
  });

  it('returns false when cache is fresh (under threshold)', () => {
    const lastUpdated = NOW - 3 * MS_PER_DAY;
    expect(isCacheStale(lastUpdated, 7, NOW)).toBe(false);
  });

  it('returns false when exactly at threshold (supera → > not >=)', () => {
    const lastUpdated = NOW - 7 * MS_PER_DAY;
    expect(isCacheStale(lastUpdated, 7, NOW)).toBe(false);
  });

  it('returns true when cache exceeds threshold', () => {
    const lastUpdated = NOW - 8 * MS_PER_DAY;
    expect(isCacheStale(lastUpdated, 7, NOW)).toBe(true);
  });

  it('returns true just over threshold (+1ms)', () => {
    const lastUpdated = NOW - 7 * MS_PER_DAY - 1;
    expect(isCacheStale(lastUpdated, 7, NOW)).toBe(true);
  });

  it('returns false for future timestamp', () => {
    const lastUpdated = NOW + MS_PER_DAY;
    expect(isCacheStale(lastUpdated, 7, NOW)).toBe(false);
  });

  it('threshold 1 day works', () => {
    expect(isCacheStale(NOW - 2 * MS_PER_DAY, 1, NOW)).toBe(true);
    expect(isCacheStale(NOW - 0.5 * MS_PER_DAY, 1, NOW)).toBe(false);
  });

  it('threshold 30 days works', () => {
    expect(isCacheStale(NOW - 31 * MS_PER_DAY, 30, NOW)).toBe(true);
    expect(isCacheStale(NOW - 29 * MS_PER_DAY, 30, NOW)).toBe(false);
  });
});

describe('getCacheAgeDays', () => {
  const NOW = new Date('2026-08-30T12:00:00Z').getTime();

  it('returns null when never synced', () => {
    expect(getCacheAgeDays(null, NOW)).toBeNull();
  });

  it('returns 0 for just now', () => {
    expect(getCacheAgeDays(NOW, NOW)).toBe(0);
  });

  it('returns floor days', () => {
    expect(getCacheAgeDays(NOW - 3.9 * MS_PER_DAY, NOW)).toBe(3);
    expect(getCacheAgeDays(NOW - 7 * MS_PER_DAY, NOW)).toBe(7);
    expect(getCacheAgeDays(NOW - 8 * MS_PER_DAY - 1000, NOW)).toBe(8);
  });

  it('returns 0 for future timestamp', () => {
    expect(getCacheAgeDays(NOW + 1000, NOW)).toBe(0);
  });
});

describe('formatLastUpdated', () => {
  it('returns Nunca for null', () => {
    expect(formatLastUpdated(null)).toBe('Nunca');
  });

  it('returns formatted date for valid timestamp', () => {
    const ts = new Date('2026-08-30T12:00:00Z').getTime();
    const formatted = formatLastUpdated(ts);
    expect(formatted).not.toBe('Nunca');
    expect(formatted.length).toBeGreaterThan(0);
  });
});
