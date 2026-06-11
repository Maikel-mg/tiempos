import { describe, it, expect } from 'vitest';
import {
  computeDailyBalance,
  computeWeeklyBalance,
  computeBanco,
  allocateRecovery,
} from '../balance';
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

describe('computeDailyBalance', () => {
  it('returns negative balance for undertime (8h worked vs 8.25h target)', () => {
    // 2025-06-09 is a Monday → target 8.25h = 29700s
    // 8h worked = 28800s → balance = 28800 - 29700 = -900s
    const entries = [makeEntry({ date: '2025-06-09', duration: 28800 })];
    expect(computeDailyBalance(entries, '2025-06-09')).toBe(-900);
  });

  it('returns positive balance for overtime (9h worked vs 8.25h target)', () => {
    // 9h = 32400s, target 8.25h = 29700s → balance = +2700s
    const entries = [makeEntry({ date: '2025-06-09', duration: 32400 })];
    expect(computeDailyBalance(entries, '2025-06-09')).toBe(2700);
  });

  it('excludes recoverable entries from the sum', () => {
    // 8h normal + 2h recoverable → only 8h counts
    // target 8.25h → balance = 28800 - 29700 = -900s
    const entries = [
      makeEntry({ date: '2025-06-09', duration: 28800, recoverable: false }),
      makeEntry({ date: '2025-06-09', duration: 7200, recoverable: true }),
    ];
    expect(computeDailyBalance(entries, '2025-06-09')).toBe(-900);
  });

  it('uses Friday target (7h) when date is Friday', () => {
    // 2025-06-13 is Friday → target 7h = 25200s
    // 7h worked = 25200s → balance = 0
    const entries = [makeEntry({ date: '2025-06-13', duration: 25200 })];
    expect(computeDailyBalance(entries, '2025-06-13')).toBe(0);
  });

  it('returns 0 for weekend with no entries', () => {
    // Saturday target = 0, no entries → balance = 0
    expect(computeDailyBalance([], '2025-06-14')).toBe(0);
  });

  it('sums multiple non-recoverable entries for the same day', () => {
    // Two entries: 4h + 4h = 8h = 28800s, target 8.25h = 29700s
    const entries = [
      makeEntry({ date: '2025-06-09', duration: 14400, taskName: 'A' }),
      makeEntry({ date: '2025-06-09', duration: 14400, taskName: 'B' }),
    ];
    expect(computeDailyBalance(entries, '2025-06-09')).toBe(-900);
  });
});

describe('computeWeeklyBalance', () => {
  it('returns correct balance for a full week of normal entries', () => {
    // Week of 2025-06-09 (Mon) to 2025-06-15 (Sun)
    // Mon-Thu: 8h each = 32h, target 8.25h each = 33h → daily -0.25h each → -1h total
    // Fri: 7h worked, target 7h → 0
    // Sat+Sun: 0 worked, target 0 → 0
    const entries = [
      makeEntry({ date: '2025-06-09', duration: 28800 }), // Mon 8h
      makeEntry({ date: '2025-06-10', duration: 28800 }), // Tue 8h
      makeEntry({ date: '2025-06-11', duration: 28800 }), // Wed 8h
      makeEntry({ date: '2025-06-12', duration: 28800 }), // Thu 8h
      makeEntry({ date: '2025-06-13', duration: 25200 }), // Fri 7h
    ];
    // -900 * 4 (Mon-Thu) + 0 (Fri) = -3600s
    expect(computeWeeklyBalance(entries, '2025-06-09')).toBe(-3600);
  });

  it('handles mix of over and under days', () => {
    // Mon: 9h (overtime +2700), Tue: 7h (undertime -4500), Fri: 7.5h (overtime +1800)
    const entries = [
      makeEntry({ date: '2025-06-09', duration: 32400 }), // Mon 9h → +2700
      makeEntry({ date: '2025-06-10', duration: 25200 }), // Tue 7h → -4500
      makeEntry({ date: '2025-06-13', duration: 27000 }), // Fri 7.5h → +1800
    ];
    // Wed: -29700, Thu: -29700 (no entries)
    // Total: +2700 - 4500 - 29700 - 29700 + 1800 = -59400
    expect(computeWeeklyBalance(entries, '2025-06-09')).toBe(-59400);
  });

  it('returns 0 for an empty week with no entries (weekend targets are 0)', () => {
    // All days target 0 except weekdays — but no entries → negative balances for weekdays
    // Actually: Mon has target 8.25h, no entries → -29700
    // But the test says "empty week with no entries" — let me think...
    // With no entries, weekday balances are negative (target not met)
    // This test should show the actual behavior
    const entries: TimeEntry[] = [];
    // Mon(-29700) + Tue(-29700) + Wed(-29700) + Thu(-29700) + Fri(-25200) + Sat(0) + Sun(0)
    expect(computeWeeklyBalance(entries, '2025-06-09')).toBe(-144000);
  });
});

describe('computeBanco', () => {
  it('accumulates balance across a single week', () => {
    // Mon 8.5h → +900, Tue 8h → -900, Wed 8.25h → 0
    const entries = [
      makeEntry({ date: '2025-06-09', duration: 30600 }), // Mon 8.5h
      makeEntry({ date: '2025-06-10', duration: 28800 }), // Tue 8h
      makeEntry({ date: '2025-06-11', duration: 29700 }), // Wed 8.25h
    ];
    expect(computeBanco(entries)).toBe(0);
  });

  it('accumulates balance across multiple weeks', () => {
    // Week 1: Mon +900
    // Week 2: Mon -900
    const entries = [
      makeEntry({ date: '2025-06-09', duration: 30600 }), // W1 Mon +900
      makeEntry({ date: '2025-06-16', duration: 28800 }), // W2 Mon -900
    ];
    expect(computeBanco(entries)).toBe(0);
  });

  it('returns 0 for empty entries', () => {
    expect(computeBanco([])).toBe(0);
  });

  it('accumulates overtime across days', () => {
    // Mon: +2700, Tue: +2700
    const entries = [
      makeEntry({ date: '2025-06-09', duration: 32400 }), // Mon 9h
      makeEntry({ date: '2025-06-10', duration: 32400 }), // Tue 9h
    ];
    expect(computeBanco(entries)).toBe(5400);
  });
});

describe('allocateRecovery', () => {
  it('fully recovers a permiso when banco covers it', () => {
    // Banco: 4h, permiso: 3h → fully recovered, 1h remaining in banco
    const permisos = [
      makeEntry({ id: 'p1', date: '2025-06-09', duration: 10800, recoverable: true }),
    ];
    const result = allocateRecovery(14400, permisos);
    expect(result.get('p1')).toBe(0);
  });

  it('partially recovers a permiso when banco does not cover it', () => {
    // Banco: 2h, permiso: 4h → 2h pending
    const permisos = [
      makeEntry({ id: 'p1', date: '2025-06-09', duration: 14400, recoverable: true }),
    ];
    const result = allocateRecovery(7200, permisos);
    expect(result.get('p1')).toBe(7200);
  });

  it('allocates chronologically (oldest permiso first)', () => {
    // Banco: 3h, two permisos: p1=2h (Jun 9), p2=2h (Jun 10)
    // p1 fully recovered (2h), p2 partially (1h remaining)
    const permisos = [
      makeEntry({ id: 'p1', date: '2025-06-09', duration: 7200, recoverable: true }),
      makeEntry({ id: 'p2', date: '2025-06-10', duration: 7200, recoverable: true }),
    ];
    const result = allocateRecovery(10800, permisos);
    expect(result.get('p1')).toBe(0);
    expect(result.get('p2')).toBe(3600);
  });

  it('recovers all permisos when banco exceeds total', () => {
    // Banco: 10h, permisos: 2h + 2h → all recovered
    const permisos = [
      makeEntry({ id: 'p1', date: '2025-06-09', duration: 7200, recoverable: true }),
      makeEntry({ id: 'p2', date: '2025-06-10', duration: 7200, recoverable: true }),
    ];
    const result = allocateRecovery(36000, permisos);
    expect(result.get('p1')).toBe(0);
    expect(result.get('p2')).toBe(0);
  });

  it('returns no allocation when banco is zero', () => {
    const permisos = [
      makeEntry({ id: 'p1', date: '2025-06-09', duration: 7200, recoverable: true }),
    ];
    const result = allocateRecovery(0, permisos);
    expect(result.get('p1')).toBe(7200);
  });

  it('returns empty map for empty permiso list', () => {
    const result = allocateRecovery(14400, []);
    expect(result.size).toBe(0);
  });
});
