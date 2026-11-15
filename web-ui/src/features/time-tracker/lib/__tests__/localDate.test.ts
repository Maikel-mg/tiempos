import { describe, it, expect, vi, afterEach } from 'vitest';
import { toLocalDateString } from '../localDate';

afterEach(() => {
  vi.useRealTimers();
});

describe('toLocalDateString', () => {
  it('formats the day with zero padding', () => {
    expect(toLocalDateString(new Date(2026, 0, 5, 13, 30))).toBe('2026-01-05');
    expect(toLocalDateString(new Date(2026, 11, 31, 23, 59, 59))).toBe('2026-12-31');
  });

  it('keeps the local day on both sides of midnight', () => {
    // toISOString() would answer 2026-06-10 / 2026-06-12 on any non-UTC machine
    expect(toLocalDateString(new Date(2026, 5, 11, 0, 30))).toBe('2026-06-11');
    expect(toLocalDateString(new Date(2026, 5, 11, 23, 30))).toBe('2026-06-11');
  });

  it('defaults to now in local time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 11, 0, 30));
    expect(toLocalDateString()).toBe('2026-06-11');
  });
});
