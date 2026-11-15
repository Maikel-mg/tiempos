import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useBalanceBreakdown } from '../useBalanceBreakdown';
import { computeBanco } from '../../lib/balance';
import type { ResolvedPeriodRange } from '../../lib/periodRange';
import type { TimeEntry } from '../../types';

// Jueves 2026-06-11 → objetivo diario 8.25h = 29700s
const THU = '2026-06-11';
const TARGET = 29700;

function makeEntry(id: string, date: string, duration: number, recoverable = false): TimeEntry {
  return {
    id,
    taskId: 100,
    taskName: `Task ${id}`,
    proceso: { proceso: 100, nombre: 'Desarrollo' },
    date,
    startTime: '09:00',
    endTime: '10:00',
    duration,
    recoverable,
    createdAt: `${date}T09:00:00Z`,
    updatedAt: `${date}T09:00:00Z`,
    synced: false,
  };
}

const WEEK: ResolvedPeriodRange = {
  start: new Date('2026-06-08T00:00:00'),
  end: new Date('2026-06-14T23:59:59'),
  startStr: '2026-06-08',
  endStr: '2026-06-14',
};

const ENTRIES = [
  makeEntry('mon', '2026-06-08', 32400), // +2700
  makeEntry('tue', '2026-06-09', 25200), // -4500
  makeEntry('prev', '2026-06-01', 32400), // +2700, fuera del período
];

function renderBreakdown(entries: TimeEntry[] = ENTRIES, timerElapsed = 0) {
  return renderHook(() =>
    useBalanceBreakdown({ entries, periodRange: WEEK, timerElapsed, today: THU }),
  );
}

describe('useBalanceBreakdown', () => {
  it('defaults to the selected period and card total equals visible total', () => {
    const { result } = renderBreakdown();

    expect(result.current.scope).toBe('period');
    expect(result.current.from).toBe('2026-06-08');
    expect(result.current.to).toBe('2026-06-14');
    expect(result.current.total).toBe(2700 - 4500);
    expect(result.current.total).toBe(result.current.visibleTotal);
    expect(result.current.rows.map((row) => row.date)).toEqual(['2026-06-08', '2026-06-09']);
  });

  it('switches to histórico with the accumulated banco and an unbounded range', () => {
    const { result } = renderBreakdown();

    act(() => result.current.setScope('global'));

    expect(result.current.from).toBe('');
    expect(result.current.to).toBe('');
    expect(result.current.total).toBe(computeBanco(ENTRIES));
    expect(result.current.rows).toHaveLength(3);

    act(() => result.current.setScope('period'));
    expect(result.current.from).toBe('2026-06-08');
    expect(result.current.to).toBe('2026-06-14');
    expect(result.current.total).toBe(2700 - 4500);
  });

  it('combines the date range and the sign filter, and sums only visible rows', () => {
    const { result } = renderBreakdown();

    act(() => result.current.setFrom('2026-06-09'));
    expect(result.current.visibleTotal).toBe(-4500);

    act(() => result.current.setSignFilter('positive'));
    expect(result.current.filteredRows).toHaveLength(0);
    expect(result.current.visibleTotal).toBe(0);

    act(() => result.current.setFrom(''));
    expect(result.current.filteredRows.map((row) => row.date)).toEqual(['2026-06-08']);
    expect(result.current.visibleTotal).toBe(2700);

    act(() => result.current.setSignFilter('negative'));
    expect(result.current.filteredRows.map((row) => row.date)).toEqual(['2026-06-09']);
    expect(result.current.visibleTotal).toBe(-4500);
  });

  it('folds the running timer into today row and keeps total = sum of rows', () => {
    const { result } = renderBreakdown([], 14400);

    expect(result.current.total).toBe(14400 - TARGET);
    expect(result.current.filteredRows).toHaveLength(1);
    expect(result.current.filteredRows[0]).toMatchObject({ date: THU, worked: 14400 });
    expect(result.current.visibleTotal).toBe(result.current.total);
  });
});
