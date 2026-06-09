import { describe, it, expect } from 'vitest';
import {
  getWeekStart,
  getWeekNumber,
  getWeekKey,
  formatWeekRange,
  formatShortDate,
  groupEntriesByWeek,
} from '../groupEntriesByWeek';
import type { TimeEntry } from '../../types';

function makeEntry(overrides: Partial<TimeEntry> & { date: string }): TimeEntry {
  return {
    id: '1',
    taskId: 100,
    taskName: 'Task 1',
    proceso: { proceso: 100, nombre: 'Desarrollo' },
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600,
    description: '',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    synced: false,
    ...overrides,
  };
}

describe('getWeekStart', () => {
  it('returns Monday for a Tuesday', () => {
    const date = new Date(2026, 5, 9); // Jun 9, 2026 = Tuesday
    const monday = getWeekStart(date);
    expect(monday.getDay()).toBe(1); // Monday
    expect(monday.getDate()).toBe(8);
  });

  it('returns Monday for a Sunday', () => {
    const date = new Date(2026, 5, 14); // Jun 14, 2026 = Sunday
    const monday = getWeekStart(date);
    expect(monday.getDay()).toBe(1);
    expect(monday.getDate()).toBe(8);
  });

  it('returns same Monday when called on a Monday', () => {
    const date = new Date(2026, 5, 8); // Jun 8, 2026 = Monday
    const monday = getWeekStart(date);
    expect(monday.getDate()).toBe(8);
  });
});

describe('getWeekNumber', () => {
  it('returns correct ISO week for Jun 9, 2026', () => {
    const date = new Date(2026, 5, 9); // Tuesday
    expect(getWeekNumber(date)).toBe(24);
  });

  it('returns week 1 for Jan 1, 2027 (belongs to week 53 of 2026)', () => {
    const date = new Date(2027, 0, 1); // Friday
    expect(getWeekNumber(date)).toBe(53);
  });
});

describe('getWeekKey', () => {
  it('returns YYYY-WXX format', () => {
    expect(getWeekKey('2026-06-09')).toBe('2026-W24');
  });
});

describe('formatWeekRange', () => {
  it('formats same-month range', () => {
    expect(formatWeekRange('2026-06-08', '2026-06-14')).toBe('8 - 14 Jun');
  });

  it('formats cross-month range', () => {
    expect(formatWeekRange('2026-12-28', '2027-01-03')).toBe('28 Dic - 3 Ene');
  });
});

describe('formatShortDate', () => {
  it('formats with Spanish day abbreviation', () => {
    expect(formatShortDate('2026-06-09')).toBe('Mar 9'); // Tuesday
  });

  it('formats Monday correctly', () => {
    expect(formatShortDate('2026-06-08')).toBe('Lun 8');
  });
});

describe('groupEntriesByWeek', () => {
  it('returns empty array for empty input', () => {
    expect(groupEntriesByWeek([])).toEqual([]);
  });

  it('groups a single day with a single entry into 1 week, 1 day', () => {
    const entries = [makeEntry({ date: '2026-06-09', duration: 3600 })];
    const result = groupEntriesByWeek(entries);

    expect(result).toHaveLength(1);
    expect(result[0].weekKey).toBe('2026-W24');
    expect(result[0].days).toHaveLength(1);
    expect(result[0].days[0].date).toBe('2026-06-09');
    expect(result[0].days[0].totalSeconds).toBe(3600);
    expect(result[0].totalSeconds).toBe(3600);
  });

  it('groups multiple days in the same week', () => {
    const entries = [
      makeEntry({ date: '2026-06-08', duration: 1000 }), // Mon
      makeEntry({ date: '2026-06-09', duration: 2000 }), // Tue
      makeEntry({ date: '2026-06-10', duration: 3000 }), // Wed
    ];
    const result = groupEntriesByWeek(entries);

    expect(result).toHaveLength(1);
    expect(result[0].days).toHaveLength(3);
    expect(result[0].totalSeconds).toBe(6000);
  });

  it('splits entries across multiple weeks', () => {
    const entries = [
      makeEntry({ date: '2026-06-08', duration: 1000 }), // Mon W24
      makeEntry({ date: '2026-06-15', duration: 2000 }), // Mon W25
    ];
    const result = groupEntriesByWeek(entries);

    expect(result).toHaveLength(2);
    expect(result[0].weekKey).toBe('2026-W25'); // Most recent first
    expect(result[1].weekKey).toBe('2026-W24');
  });

  it('sorts days Monday→Sunday within a week', () => {
    const entries = [
      makeEntry({ date: '2026-06-12', duration: 1000 }), // Fri
      makeEntry({ date: '2026-06-08', duration: 2000 }), // Mon
      makeEntry({ date: '2026-06-10', duration: 3000 }), // Wed
    ];
    const result = groupEntriesByWeek(entries);

    expect(result[0].days[0].date).toBe('2026-06-08'); // Mon
    expect(result[0].days[1].date).toBe('2026-06-10'); // Wed
    expect(result[0].days[2].date).toBe('2026-06-12'); // Fri
  });

  it('sorts weeks descending (most recent first)', () => {
    const entries = [
      makeEntry({ date: '2026-06-01', duration: 1000 }), // W23
      makeEntry({ date: '2026-06-15', duration: 2000 }), // W25
      makeEntry({ date: '2026-06-08', duration: 3000 }), // W24
    ];
    const result = groupEntriesByWeek(entries);

    expect(result[0].weekKey).toBe('2026-W25');
    expect(result[1].weekKey).toBe('2026-W24');
    expect(result[2].weekKey).toBe('2026-W23');
  });

  it('calculates correct totals at day and week level', () => {
    const entries = [
      makeEntry({ date: '2026-06-08', duration: 1800, taskName: 'A' }),
      makeEntry({ date: '2026-06-08', duration: 1800, taskName: 'B' }),
      makeEntry({ date: '2026-06-09', duration: 3600, taskName: 'C' }),
    ];
    const result = groupEntriesByWeek(entries);

    // Day totals
    expect(result[0].days[0].totalSeconds).toBe(3600); // Mon: 1800+1800
    expect(result[0].days[1].totalSeconds).toBe(3600); // Tue: 3600

    // Week total
    expect(result[0].totalSeconds).toBe(7200);
  });

  it('sets correct weekStart and weekEnd for a week', () => {
    const entries = [
      makeEntry({ date: '2026-06-09', duration: 1000 }), // Tue
    ];
    const result = groupEntriesByWeek(entries);

    expect(result[0].weekStart).toBe('2026-06-08'); // Monday
    expect(result[0].weekEnd).toBe('2026-06-14');   // Sunday
    expect(result[0].weekRangeFormatted).toBe('8 - 14 Jun');
  });

  it('uses date field for grouping, not startTime', () => {
    const entries = [
      makeEntry({ date: '2026-06-09', startTime: '23:00', endTime: '23:59', duration: 59 }),
    ];
    const result = groupEntriesByWeek(entries);

    expect(result[0].days[0].date).toBe('2026-06-09');
    expect(result[0].days[0].entries).toHaveLength(1);
  });

  it('includes all entries in each day group', () => {
    const entries = [
      makeEntry({ date: '2026-06-09', duration: 1000, taskName: 'Task A' }),
      makeEntry({ date: '2026-06-09', duration: 2000, taskName: 'Task B' }),
      makeEntry({ date: '2026-06-09', duration: 3000, taskName: 'Task C' }),
    ];
    const result = groupEntriesByWeek(entries);

    expect(result[0].days[0].entries).toHaveLength(3);
    expect(result[0].days[0].totalSeconds).toBe(6000);
  });
});
