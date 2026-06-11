import { describe, it, expect } from 'vitest';
import { getDailyTarget } from '../schedule';

describe('getDailyTarget', () => {
  it('returns 8.25 for a normal weekday (Mon-Thu)', () => {
    // 2025-06-09 is a Monday
    expect(getDailyTarget('2025-06-09')).toBe(8.25);
    // 2025-06-10 is a Tuesday
    expect(getDailyTarget('2025-06-10')).toBe(8.25);
    // 2025-06-11 is a Wednesday
    expect(getDailyTarget('2025-06-11')).toBe(8.25);
    // 2025-06-12 is a Thursday
    expect(getDailyTarget('2025-06-12')).toBe(8.25);
  });

  it('returns 7 for Friday', () => {
    // 2025-06-13 is a Friday
    expect(getDailyTarget('2025-06-13')).toBe(7);
  });

  it('returns 0 for weekend days', () => {
    // 2025-06-14 is a Saturday
    expect(getDailyTarget('2025-06-14')).toBe(0);
    // 2025-06-15 is a Sunday
    expect(getDailyTarget('2025-06-15')).toBe(0);
  });

  it('returns exception dailyHours when date falls within exception range', () => {
    // 2025-07-01 to 2025-09-15 is summer schedule (7h)
    expect(getDailyTarget('2025-07-01')).toBe(7);
    expect(getDailyTarget('2025-08-15')).toBe(7);
    expect(getDailyTarget('2025-09-15')).toBe(7);
  });

  it('returns default schedule for dates just outside exception range', () => {
    // Day before exception start: 2025-06-30 is a Monday → 8.25
    expect(getDailyTarget('2025-06-30')).toBe(8.25);
    // Day after exception end: 2025-09-16 is a Tuesday → 8.25
    expect(getDailyTarget('2025-09-16')).toBe(8.25);
  });
});
