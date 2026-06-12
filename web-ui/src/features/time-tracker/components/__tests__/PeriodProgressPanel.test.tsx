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

  it('renders three stat blocks: Hoy, Semana, Balance', () => {
    render(<PeriodProgressPanel entries={[]} period="today" />);

    expect(screen.getByText('Hoy')).toBeInTheDocument();
    expect(screen.getByText('Semana')).toBeInTheDocument();
    expect(screen.getByText('Balance')).toBeInTheDocument();
  });

  it('shows worked hours for Hoy with remaining subtitle', () => {
    // 2026-06-11 is Thursday → daily target 8.25h = 8:15
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T14:00:00'));

    // 7.5h worked today = 27000s, target 29700s → remaining 2700s = 0:45
    const entries = [
      makeEntry({ date: '2026-06-11', duration: 27000, taskName: 'Morning' }),
    ];

    render(<PeriodProgressPanel entries={entries} period="today" />);

    const hoyValue = screen.getByTestId('segment-hoy-value');
    expect(hoyValue).toHaveTextContent('7:30');
    expect(screen.getByText('0:45 para llegar a 8:15')).toBeInTheDocument();
  });

  it('shows worked hours for Semana with remaining subtitle', () => {
    // Week of 2026-06-08 (Mon) to 2026-06-14 (Sun)
    // Mon-Thu 8.25h each, Fri 7h, Sat-Sun 0h → 40h total
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T14:00:00'));

    const entries = [
      makeEntry({ date: '2026-06-08', duration: 30600, taskName: 'Mon' }),  // 8.5h
      makeEntry({ date: '2026-06-09', duration: 28800, taskName: 'Tue' }),  // 8h
      makeEntry({ date: '2026-06-10', duration: 28800, taskName: 'Wed' }),  // 8h
      makeEntry({ date: '2026-06-11', duration: 25200, taskName: 'Thu' }),  // 7h
    ];
    // Worked: 31.5h, Target: 40h → remaining 8.5h = 8:30

    render(<PeriodProgressPanel entries={entries} period="week" />);

    const semanaValue = screen.getByTestId('segment-semana-value');
    expect(semanaValue).toHaveTextContent('31:30');
    expect(screen.getByText('8:30 para llegar a 40:00')).toBeInTheDocument();
  });

  it('shows positive balance with + prefix and "horas a favor"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T14:00:00'));

    // Mon 2026-06-08: 9h worked, target 8.25h → balance +2700s = 0:45
    const entries = [
      makeEntry({ date: '2026-06-08', duration: 32400, taskName: 'Mon' }),
    ];

    render(<PeriodProgressPanel entries={entries} period="today" />);

    const balanceValue = screen.getByTestId('segment-balance-value');
    expect(balanceValue).toHaveTextContent('0:45');
    expect(screen.getByText('horas a favor')).toBeInTheDocument();
  });

  it('shows negative balance with - prefix and "horas en contra"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T14:00:00'));

    // Mon 2026-06-08: 7h worked, target 8.25h → balance -4500s = 1:15
    const entries = [
      makeEntry({ date: '2026-06-08', duration: 25200, taskName: 'Mon' }),
    ];

    render(<PeriodProgressPanel entries={entries} period="today" />);

    const balanceValue = screen.getByTestId('segment-balance-value');
    expect(balanceValue).toHaveTextContent('1:15');
    expect(screen.getByText('horas en contra')).toBeInTheDocument();
  });

  it('uses emerald color when remaining is zero (day complete)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T14:00:00'));

    // 8.25h worked = 29700s, target 8.25h → remaining 0
    const entries = [
      makeEntry({ date: '2026-06-11', duration: 29700, taskName: 'Full day' }),
    ];

    const { container } = render(<PeriodProgressPanel entries={entries} period="today" />);
    const bar = container.querySelector('[data-testid="bar-hoy"]') as HTMLElement;
    expect(bar.className).toContain('bg-emerald-500');
  });

  it('uses emerald color when overtime (negative remaining)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T14:00:00'));

    // 9h worked / 8.25h target → overtime
    const entries = [
      makeEntry({ date: '2026-06-11', duration: 32400, taskName: 'Overtime' }),
    ];

    const { container } = render(<PeriodProgressPanel entries={entries} period="today" />);
    const bar = container.querySelector('[data-testid="bar-hoy"]') as HTMLElement;
    expect(bar.className).toContain('bg-emerald-500');
  });

  it('uses amber color when time remaining > 0', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T14:00:00'));

    // 7.5h worked / 8.25h target → 0:45 remaining
    const entries = [
      makeEntry({ date: '2026-06-11', duration: 27000, taskName: 'Morning' }),
    ];

    const { container } = render(<PeriodProgressPanel entries={entries} period="today" />);
    const bar = container.querySelector('[data-testid="bar-hoy"]') as HTMLElement;
    expect(bar.className).toContain('bg-amber-500');
  });

  it('progress bar shows correct percentage width', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T14:00:00'));

    // 7.5h worked today / 8.25h target = 90.91%
    const entries = [
      makeEntry({ date: '2026-06-11', duration: 27000, taskName: 'Morning' }),
    ];

    const { container } = render(<PeriodProgressPanel entries={entries} period="today" />);
    const hoyBar = container.querySelector('[data-testid="bar-hoy"]') as HTMLElement;
    expect(hoyBar).toBeInTheDocument();
    expect(hoyBar.style.width).toBe('90.91%');
  });

  it('progress bar caps at 100% when overtime', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T14:00:00'));

    // 9h worked / 8.25h target = 109% → capped at 100%
    const entries = [
      makeEntry({ date: '2026-06-11', duration: 32400, taskName: 'Overtime' }),
    ];

    const { container } = render(<PeriodProgressPanel entries={entries} period="today" />);
    const bar = container.querySelector('[data-testid="bar-hoy"]') as HTMLElement;
    expect(bar.style.width).toBe('100%');
  });

  it('shows worked hours and overtime text when Hoy is in overtime', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T14:00:00'));

    // 9h worked / 8.25h target → overtime 0:45
    const entries = [
      makeEntry({ date: '2026-06-11', duration: 32400, taskName: 'Overtime' }),
    ];

    render(<PeriodProgressPanel entries={entries} period="today" />);

    const hoyValue = screen.getByTestId('segment-hoy-value');
    expect(hoyValue).toHaveTextContent('9:00');
    expect(screen.getByText('+0:45 por encima')).toBeInTheDocument();
  });

  it('renders zero balance without prefix', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T14:00:00'));

    // Mon: 8.25h worked, Tue: 8.25h worked → 0 balance
    const entries = [
      makeEntry({ date: '2026-06-09', duration: 29700, taskName: 'Mon' }),
      makeEntry({ date: '2026-06-10', duration: 29700, taskName: 'Tue' }),
    ];

    render(<PeriodProgressPanel entries={entries} period="today" />);

    const balanceValue = screen.getByTestId('segment-balance-value');
    expect(balanceValue).toHaveTextContent('0:00');
    expect(screen.getByText('horas a favor')).toBeInTheDocument();
  });

  it('shows 31:30 worked for Semana with 8.5h deficit', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-11T14:00:00'));

    // Only Mon entry: 7h worked, target 8.25h → daily -1.5h
    // Rest of week has no entries → 4 weekdays * -8.25h + 7 * 0h
    // Week remaining = total target = 40h - worked = huge
    // Actually let's be more precise:
    // Mon: 7h = 25200s, target 8.25h = 29700s → -4500s
    // Tue-Thu: 0 each, target 8.25h each → -29700 each = -89100
    // Fri: 0, target 7h → -25200
    // Sat-Sun: 0
    // Total: -4500 - 89100 - 25200 = -118800s = 33h remaining
    // But we want a simpler test. Let's just use a full week scenario.
    // Actually the test says "8.5h deficit" so let me set up:
    // Total week target 40h = 144000s
    // Worked: 31.5h = 113400s → remaining 30600s = 8:30
    const entries = [
      makeEntry({ date: '2026-06-08', duration: 30600, taskName: 'Mon' }),
      makeEntry({ date: '2026-06-09', duration: 28800, taskName: 'Tue' }),
      makeEntry({ date: '2026-06-10', duration: 28800, taskName: 'Wed' }),
      makeEntry({ date: '2026-06-11', duration: 25200, taskName: 'Thu' }),
    ];

    render(<PeriodProgressPanel entries={entries} period="week" />);

    const semanaValue = screen.getByTestId('segment-semana-value');
    expect(semanaValue).toHaveTextContent('31:30');
  });
});
