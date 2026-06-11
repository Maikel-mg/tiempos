import { describe, it, expect } from 'vitest';
import { computePeriodTotal } from '../computePeriodTotal';
import type { TimeEntry } from '../../types';

function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    id: '1',
    taskId: 1,
    taskName: 'Test',
    date: '2026-06-11',
    startTime: '09:00',
    endTime: '10:00',
    duration: 3600,
    createdAt: '2026-06-11T09:00:00Z',
    updatedAt: '2026-06-11T09:00:00Z',
    synced: false,
    ...overrides,
  };
}

describe('computePeriodTotal', () => {
  it('returns sum of entry durations when today is not in range', () => {
    const entries = [makeEntry({ duration: 3600 }), makeEntry({ duration: 1800 })];
    const total = computePeriodTotal(entries, 500, false);
    expect(total).toBe(5400);
  });

  it('adds timer elapsed when today is in range', () => {
    const entries = [makeEntry({ duration: 3600 }), makeEntry({ duration: 1800 })];
    const total = computePeriodTotal(entries, 2557, true);
    expect(total).toBe(7957); // 3600 + 1800 + 2557
  });

  it('returns only timer elapsed when entries are empty and today is in range', () => {
    const total = computePeriodTotal([], 2557, true);
    expect(total).toBe(2557);
  });

  it('returns 0 when entries are empty and today is not in range', () => {
    const total = computePeriodTotal([], 2557, false);
    expect(total).toBe(0);
  });

  it('returns 0 when entries are empty and elapsed is 0', () => {
    const total = computePeriodTotal([], 0, true);
    expect(total).toBe(0);
  });

  it('does not add elapsed when elapsed is 0 even if today is in range', () => {
    const entries = [makeEntry({ duration: 3600 })];
    const total = computePeriodTotal(entries, 0, true);
    expect(total).toBe(3600);
  });

  it('returns 0 entries total when all entries are recoverable', () => {
    const entries = [
      makeEntry({ duration: 3600, recoverable: true }),
      makeEntry({ duration: 1800, recoverable: true }),
    ];
    const total = computePeriodTotal(entries, 0, false);
    expect(total).toBe(0);
  });

  it('adds timer to 0 when all entries are recoverable and today is in range', () => {
    const entries = [
      makeEntry({ duration: 3600, recoverable: true }),
    ];
    const total = computePeriodTotal(entries, 2557, true);
    expect(total).toBe(2557); // timer only, recoverable excluded
  });

  it('excludes recoverable entries from total', () => {
    const entries = [
      makeEntry({ duration: 3600 }),
      makeEntry({ duration: 1800, recoverable: true }),
      makeEntry({ duration: 2400 }),
    ];
    const total = computePeriodTotal(entries, 0, false);
    expect(total).toBe(6000); // 3600 + 2400 (1800 excluded)
  });
});
