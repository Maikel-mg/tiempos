import { useMemo } from 'react';
import { computeDailyBalance, computeWeeklyBalance, computeBanco } from '../lib/balance';
import { getDailyTarget } from '../lib/schedule';
import type { TimeEntry } from '../types';
import type { PeriodType } from '@/components/shared/PeriodSelector';

export interface PeriodProgressPanelProps {
  entries: TimeEntry[];
  period: PeriodType;
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getWeekStartStr(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  return monday.toISOString().slice(0, 10);
}

function formatHM(seconds: number): string {
  const abs = Math.abs(seconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

function formatTargetHM(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

function percentWidth(worked: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((worked / target) * 10000) / 100);
}

function barColor(percent: number): string {
  if (percent >= 100) return 'bg-green-500';
  if (percent >= 80) return 'bg-amber-500';
  return 'bg-red-500';
}

export function PeriodProgressPanel({ entries, period: _period }: PeriodProgressPanelProps) {
  const todayStr = getTodayStr();
  const weekStartStr = getWeekStartStr();

  const todayTargetHours = getDailyTarget(todayStr);
  const todayTargetSec = todayTargetHours * 3600;

  const dailyBalance = useMemo(
    () => computeDailyBalance(entries, todayStr),
    [entries, todayStr],
  );
  const workedToday = todayTargetSec + dailyBalance;

  const weekTargetSec = useMemo(() => {
    let total = 0;
    const monday = new Date(weekStartStr + 'T12:00:00');
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      const dateStr = day.toISOString().slice(0, 10);
      total += getDailyTarget(dateStr) * 3600;
    }
    return total;
  }, [weekStartStr]);

  const weeklyBalance = useMemo(
    () => computeWeeklyBalance(entries, weekStartStr),
    [entries, weekStartStr],
  );
  const workedWeek = weekTargetSec + weeklyBalance;

  const banco = useMemo(
    () => computeBanco(entries),
    [entries],
  );

  const hoyPercent = percentWidth(workedToday, todayTargetSec);
  const semanaPercent = percentWidth(workedWeek, weekTargetSec);

  return (
    <div className="flex gap-4" data-testid="period-progress-panel">
      <div data-testid="segment-hoy">
        <span>Hoy</span>
        <span>{formatHM(workedToday)} / {formatTargetHM(todayTargetHours)}</span>
        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
          <div
            data-testid="bar-hoy"
            className={`h-full rounded-full ${barColor(hoyPercent)}`}
            style={{ width: `${hoyPercent}%` }}
          />
        </div>
      </div>
      <div data-testid="segment-semana">
        <span>Semana</span>
        <span>{formatHM(workedWeek)} / {formatHM(weekTargetSec)}</span>
        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
          <div
            data-testid="bar-semana"
            className={`h-full rounded-full ${barColor(semanaPercent)}`}
            style={{ width: `${semanaPercent}%` }}
          />
        </div>
      </div>
      <div data-testid="segment-banco">
        <span>Banco</span>
        <span>
          {banco >= 0
            ? `${formatHM(banco)} a favor`
            : `${formatHM(banco)} en contra`}
        </span>
      </div>
    </div>
  );
}
