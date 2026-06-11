import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Calendar, Landmark, Check } from 'lucide-react';
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

function formatHM(totalSeconds: number): string {
  const abs = Math.abs(totalSeconds);
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

function signPrefix(seconds: number): string {
  if (seconds > 0) return '+';
  return '';
}

interface CardData {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  segmentTestId: string;
  barTestId: string;
  value: number;
  targetText: string;
  percent: number;
  isCompleted: boolean;
}

function ProgressCard({ card }: { card: CardData }) {
  const completed = card.isCompleted;
  const color = completed
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-amber-600 dark:text-amber-400';
  const barColor = completed ? 'bg-emerald-500' : 'bg-amber-500';
  const barBg = completed ? 'bg-emerald-500/15' : 'bg-amber-500/15';
  const Icon = card.icon;

  return (
    <Card className="flex-1" data-testid={card.segmentTestId}>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-widest">
            {card.label}
          </span>
        </div>

        <div className="flex items-baseline gap-1.5">
          {completed ? (
            <Check className={`text-3xl ${color}`} data-testid={`${card.segmentTestId}-value`} />
          ) : (
            <>
              {card.value > 0 && (
                <span className={`text-lg font-bold ${color}`}>-</span>
              )}
              <span
                className={`text-3xl font-bold tabular-nums tracking-tight leading-none ${color}`}
                data-testid={`${card.segmentTestId}-value`}
              >
                {formatHM(Math.abs(card.value))}
              </span>
            </>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          {completed ? '¡Completado!' : card.targetText}
        </p>

        <div className={`h-2.5 w-full rounded-full overflow-hidden ${barBg}`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
            style={{ width: `${Math.min(100, card.percent)}%` }}
            data-testid={card.barTestId}
          />
        </div>

        <span className={`text-xs font-bold ${color}`}>{card.percent}%</span>
      </CardContent>
    </Card>
  );
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
  const dailyRemaining = -dailyBalance;

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
  const weeklyRemaining = -weeklyBalance;

  const banco = useMemo(() => computeBanco(entries), [entries]);

  const hoyPercent = percentWidth(workedToday, todayTargetSec);
  const semanaPercent = percentWidth(workedWeek, weekTargetSec);
  const bancoPercent = banco >= 0 ? 100 : 0;

  const cards: CardData[] = [
    {
      icon: Clock,
      label: 'Hoy',
      segmentTestId: 'segment-hoy',
      barTestId: 'bar-hoy',
      value: dailyRemaining,
      targetText: `para llegar a ${formatTargetHM(todayTargetHours)}`,
      percent: hoyPercent,
      isCompleted: dailyRemaining <= 0,
    },
    {
      icon: Calendar,
      label: 'Semana',
      segmentTestId: 'segment-semana',
      barTestId: 'bar-semana',
      value: weeklyRemaining,
      targetText: `para llegar a ${formatHM(weekTargetSec)}`,
      percent: semanaPercent,
      isCompleted: weeklyRemaining <= 0,
    },
    {
      icon: Landmark,
      label: 'Banco',
      segmentTestId: 'segment-banco',
      barTestId: 'bar-banco',
      value: banco,
      targetText: banco >= 0 ? 'horas a favor' : 'horas en contra',
      percent: bancoPercent,
      isCompleted: false,
    },
  ];

  return (
    <div
      className="flex flex-col sm:flex-row gap-3"
      data-testid="period-progress-panel"
    >
      {cards.map((card) => (
        <ProgressCard key={card.label} card={card} />
      ))}
    </div>
  );
}
