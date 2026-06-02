import { describe, it, expect } from 'vitest';
import { detectCrossing } from '../timerCrossingDetector';

describe('detectCrossing', () => {
  it('returns crossed: false for same-day timer', () => {
    const start = new Date(2026, 5, 1, 9, 0); // Jun 1 09:00
    const end = new Date(2026, 5, 1, 17, 0);  // Jun 1 17:00
    const result = detectCrossing(start, end);
    expect(result.crossed).toBe(false);
    expect(result.splits).toBeUndefined();
  });

  it('detects one midnight crossing with correct split minutes', () => {
    const start = new Date(2026, 5, 1, 23, 30); // Jun 1 23:30
    const end = new Date(2026, 5, 2, 0, 15);    // Jun 2 00:15
    const result = detectCrossing(start, end);
    expect(result.crossed).toBe(true);
    expect(result.splits).toHaveLength(2);
    // 45 minutes total
    const totalMinutes = result.splits!.reduce((sum, s) => sum + s.minutes, 0);
    expect(totalMinutes).toBe(Math.floor((end.getTime() - start.getTime()) / 60000));
  });

  it('returns 3 splits for two midnight crossings (multi-day)', () => {
    // Jun 1 10:00 → Jun 3 08:00 = 46 hours = 2760 minutes, crosses 2 midnights
    const start = new Date(2026, 5, 1, 10, 0);
    const end = new Date(2026, 5, 3, 8, 0);
    const result = detectCrossing(start, end);
    expect(result.crossed).toBe(true);
    expect(result.splits).toHaveLength(3);
    const totalMinutes = result.splits!.reduce((sum, s) => sum + s.minutes, 0);
    expect(totalMinutes).toBe(Math.floor((end.getTime() - start.getTime()) / 60000));
  });

  it('handles 1-minute timer at 23:59 crossing midnight', () => {
    const start = new Date(2026, 5, 1, 23, 59); // Jun 1 23:59
    const end = new Date(2026, 5, 2, 0, 0);     // Jun 2 00:00
    const result = detectCrossing(start, end);
    expect(result.crossed).toBe(true);
    expect(result.splits).toHaveLength(2);
    expect(result.splits![0].minutes).toBe(1);
    expect(result.splits![1].minutes).toBe(0);
    expect(result.splits![0].minutes + result.splits![1].minutes).toBe(1);
  });

  it('handles 25-hour timer crossing midnight twice', () => {
    const start = new Date(2026, 5, 1, 10, 0);  // Jun 1 10:00
    const end = new Date(2026, 5, 2, 11, 0);    // Jun 2 11:00 (25h later)
    const result = detectCrossing(start, end);
    expect(result.crossed).toBe(true);
    expect(result.splits).toHaveLength(2);
    const totalMinutes = result.splits!.reduce((sum, s) => sum + s.minutes, 0);
    expect(totalMinutes).toBe(1500); // 25 * 60
  });

  it('handles minutes precision (37.5min → 29+8)', () => {
    // 23:30:15 → 00:07:45 = 37 minutes 30 seconds = 37.5min
    const start = new Date(2026, 5, 1, 23, 30, 15);
    const end = new Date(2026, 5, 2, 0, 7, 45);
    const result = detectCrossing(start, end);
    expect(result.crossed).toBe(true);
    expect(result.splits).toHaveLength(2);
    // floor(37.5) = 37 total minutes distributed
    const totalMinutes = result.splits!.reduce((sum, s) => sum + s.minutes, 0);
    expect(totalMinutes).toBe(Math.floor((end.getTime() - start.getTime()) / 60000));
  });

  it('returns crossed: false when start equals end', () => {
    const date = new Date(2026, 5, 1, 12, 0);
    const result = detectCrossing(date, date);
    expect(result.crossed).toBe(false);
    expect(result.splits).toBeUndefined();
  });
});
