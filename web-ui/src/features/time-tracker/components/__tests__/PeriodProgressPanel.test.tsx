import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PeriodProgressPanel } from '../PeriodProgressPanel';
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

describe('PeriodProgressPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('renders three segments: Hoy, Semana, Banco', () => {
    render(<PeriodProgressPanel entries={[]} period="today" />);

    expect(screen.getByText('Hoy')).toBeInTheDocument();
    expect(screen.getByText('Semana')).toBeInTheDocument();
    expect(screen.getByText('Banco')).toBeInTheDocument();
  });

  it('shows correct hours and target for Hoy', () => {
    // 2026-06-11 is Thursday → daily target 8.25h = 8:15
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T14:00:00'));

    // 7.5h worked today = 27000s
    const entries = [
      makeEntry({ date: '2026-06-11', duration: 27000, taskName: 'Morning' }),
    ];

    render(<PeriodProgressPanel entries={entries} period="today" />);

    // Hoy segment should show "7:30 / 8:15"
    expect(screen.getByText('7:30 / 8:15')).toBeInTheDocument();
  });

  it('shows correct hours and target for Semana', () => {
    // Week of 2026-06-08 (Mon) to 2026-06-14 (Sun)
    // Targets: Mon-Thu 8.25h each, Fri 7h, Sat-Sun 0h → total 40h
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T14:00:00'));

    const entries = [
      makeEntry({ date: '2026-06-08', duration: 30600, taskName: 'Mon' }),  // 8.5h
      makeEntry({ date: '2026-06-09', duration: 28800, taskName: 'Tue' }),  // 8h
      makeEntry({ date: '2026-06-10', duration: 28800, taskName: 'Wed' }),  // 8h
      makeEntry({ date: '2026-06-11', duration: 25200, taskName: 'Thu' }),  // 7h
    ];
    // Total worked: 30600+28800+28800+25200 = 113400s = 31:30

    render(<PeriodProgressPanel entries={entries} period="week" />);

    expect(screen.getByText('31:30 / 40:00')).toBeInTheDocument();
  });

  it('shows banco with "a favor" when balance is positive', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T14:00:00'));

    // Mon 2026-06-08: 9h worked, target 8.25h → balance +2700s = 0:45
    const entries = [
      makeEntry({ date: '2026-06-08', duration: 32400, taskName: 'Mon' }),
    ];

    render(<PeriodProgressPanel entries={entries} period="today" />);

    expect(screen.getByText('0:45 a favor')).toBeInTheDocument();
  });

  it('shows banco with "en contra" when balance is negative', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T14:00:00'));

    // Mon 2026-06-08: 7h worked, target 8.25h → balance -4500s = 1:15
    const entries = [
      makeEntry({ date: '2026-06-08', duration: 25200, taskName: 'Mon' }),
    ];

    render(<PeriodProgressPanel entries={entries} period="today" />);

    expect(screen.getByText('1:15 en contra')).toBeInTheDocument();
  });

  it('progress bars show correct percentage width', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T14:00:00'));

    // 7.5h worked today / 8.25h target = 90.91%
    const entries = [
      makeEntry({ date: '2026-06-11', duration: 27000, taskName: 'Morning' }),
    ];

    const { container } = render(<PeriodProgressPanel entries={entries} period="today" />);

    const hoyBar = container.querySelector('[data-testid="bar-hoy"]') as HTMLElement;
    expect(hoyBar).toBeInTheDocument();
    // 27000 / 29700 * 100 = 90.909...%
    expect(hoyBar.style.width).toBe('90.91%');
  });

  it('progress bar uses green when >= 100%', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T14:00:00'));

    // 9h worked / 8.25h target = 109% → green
    const entries = [
      makeEntry({ date: '2026-06-11', duration: 32400, taskName: 'Overtime' }),
    ];

    const { container } = render(<PeriodProgressPanel entries={entries} period="today" />);
    const bar = container.querySelector('[data-testid="bar-hoy"]') as HTMLElement;
    expect(bar.className).toContain('bg-green-500');
  });

  it('progress bar uses amber when >= 80% and < 100%', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T14:00:00'));

    // 7.5h worked / 8.25h target = 90.91% → amber
    const entries = [
      makeEntry({ date: '2026-06-11', duration: 27000, taskName: 'Morning' }),
    ];

    const { container } = render(<PeriodProgressPanel entries={entries} period="today" />);
    const bar = container.querySelector('[data-testid="bar-hoy"]') as HTMLElement;
    expect(bar.className).toContain('bg-amber-500');
  });

  it('progress bar uses red when < 80%', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T14:00:00'));

    // 5h worked / 8.25h target = 60.6% → red
    const entries = [
      makeEntry({ date: '2026-06-11', duration: 18000, taskName: 'Short' }),
    ];

    const { container } = render(<PeriodProgressPanel entries={entries} period="today" />);
    const bar = container.querySelector('[data-testid="bar-hoy"]') as HTMLElement;
    expect(bar.className).toContain('bg-red-500');
  });
});
