import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Calendar, Landmark, CalendarDays } from 'lucide-react';
import { computeDailyBalance, computeWeeklyBalance, computeBanco } from '../lib/balance';
import { getDailyTarget } from '../lib/schedule';
import type { TimeEntry } from '../types';
import type { PeriodType } from '@/components/shared/PeriodSelector';

export interface PeriodProgressPanelProps {
  entries: TimeEntry[];
  period: PeriodType;
  /** Elapsed seconds from a running timer (throttled). Added to today/week/month worked. */
  timerElapsed?: number;
  /** Whether today falls within the selected period range. */
  todayInRange?: boolean;
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

function getMonthStartStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
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

const SPANISH_DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const SPANISH_MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatBreakdownDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayName = SPANISH_DAYS_SHORT[date.getDay()];
  const monthName = SPANISH_MONTHS_SHORT[date.getMonth()];
  return `${dayName} ${date.getDate()} ${monthName}`;
}

interface CardData {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  segmentTestId: string;
  barTestId: string;
  workedStr: string;
  subtext: string;
  accentClass: string;
  percent: number;
  onClick?: () => void;
}

function ProgressCard({ card, onClick }: { card: CardData; onClick?: () => void }) {
  const color = card.accentClass || 'text-amber-600 dark:text-amber-400';
  const barColor = card.accentClass ? 'bg-emerald-500' : 'bg-amber-500';
  const barBg = card.accentClass ? 'bg-emerald-500/15' : 'bg-amber-500/15';
  const Icon = card.icon;

  return (
    <Card
      className={`flex-1${onClick ? ' cursor-pointer hover:bg-accent/50 transition-colors' : ''}`}
      onClick={onClick}
      data-testid={card.segmentTestId}
    >
      <CardContent className="flex flex-col gap-2 p-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-widest">
            {card.label}
          </span>
        </div>

        <span
          className={`text-2xl font-bold tabular-nums tracking-tight leading-none ${color}`}
          data-testid={`${card.segmentTestId}-value`}
        >
          {card.workedStr}
        </span>

        <p className={`text-sm ${card.accentClass || 'text-muted-foreground'}`}>
          {card.subtext}
        </p>

        <div className={`h-1.5 w-full rounded-full overflow-hidden ${barBg}`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${barColor}`}
            style={{ width: `${Math.min(100, card.percent)}%` }}
            data-testid={card.barTestId}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export function PeriodProgressPanel({
  entries,
  period: _period,
  timerElapsed = 0,
  todayInRange = false,
}: PeriodProgressPanelProps) {
  const todayStr = getTodayStr();
  const weekStartStr = getWeekStartStr();
  const monthStartStr = getMonthStartStr();

  // Timer elapsed only counts when today is in the selected period range
  const elapsed = todayInRange ? timerElapsed : 0;

  const todayTargetHours = getDailyTarget(todayStr);
  const todayTargetSec = todayTargetHours * 3600;

  const dailyBalance = useMemo(
    () => computeDailyBalance(entries, todayStr),
    [entries, todayStr],
  );
  const workedToday = todayTargetSec + dailyBalance + elapsed;
  const dailyRemaining = todayTargetSec - workedToday;

  const weekTargetSec = useMemo(() => {
    let total = 0;
    const monday = new Date(weekStartStr + 'T12:00:00');
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      const dateStr = day.toISOString().slice(0, 10);
      const target = getDailyTarget(dateStr);
      if (target > 0) total += target * 3600;
    }
    return total;
  }, [weekStartStr]);

  const weeklyBalance = useMemo(
    () => computeWeeklyBalance(entries, weekStartStr),
    [entries, weekStartStr],
  );
  const workedWeek = weekTargetSec + weeklyBalance + elapsed;
  const weeklyRemaining = weekTargetSec - workedWeek;

  const monthTargetSec = useMemo(() => {
    let total = 0;
    const now = new Date();
    const daysInMonth = getDaysInMonth(now);
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const target = getDailyTarget(dateStr);
      if (target > 0) total += target * 3600;
    }
    return total;
  }, []);

  const monthlyBalance = useMemo(() => {
    let total = 0;
    const now = new Date();
    const daysInMonth = getDaysInMonth(now);
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      total += computeDailyBalance(entries, dateStr);
    }
    return total;
  }, [entries]);

  const workedMonth = monthTargetSec + monthlyBalance + elapsed;
  const monthlyRemaining = monthTargetSec - workedMonth;

  const banco = useMemo(() => computeBanco(entries), [entries]);

  const [balanceSheetOpen, setBalanceSheetOpen] = useState(false);
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'positive' | 'negative'>('all');

  const breakdown = useMemo(() => {
    // Group entries by date (exclude recoverable)
    const dateMap = new Map<string, number>(); // date -> worked seconds
    for (const entry of entries) {
      if (entry.recoverable) continue;
      const existing = dateMap.get(entry.date) || 0;
      dateMap.set(entry.date, existing + entry.duration);
    }
    // Convert to array with target and delta
    const items = Array.from(dateMap.entries()).map(([date, worked]) => {
      const target = getDailyTarget(date) * 3600;
      return {
        date,
        worked,
        target,
        delta: worked - target,
      };
    });
    // Sort by date ascending
    items.sort((a, b) => a.date.localeCompare(b.date));
    return items;
  }, [entries]);

  const filteredBreakdown = useMemo(() => {
    if (balanceFilter === 'positive') return breakdown.filter((item) => item.delta > 0);
    if (balanceFilter === 'negative') return breakdown.filter((item) => item.delta < 0);
    return breakdown;
  }, [breakdown, balanceFilter]);

  const hoyPercent = percentWidth(workedToday, todayTargetSec);
  const semanaPercent = percentWidth(workedWeek, weekTargetSec);
  const mesPercent = percentWidth(workedMonth, monthTargetSec);
  const balancePercent = banco >= 0 ? 100 : 0;

  const targetStr = formatTargetHM(todayTargetHours);

  let hoySubtext: string;
  let hoyAccent: string;
  if (dailyRemaining > 0) {
    hoySubtext = `${formatHM(dailyRemaining)} para llegar a ${targetStr}`;
    hoyAccent = '';
  } else if (dailyRemaining === 0) {
    hoySubtext = '¡Objetivo cumplido!';
    hoyAccent = 'text-emerald-600 dark:text-emerald-400';
  } else {
    hoySubtext = `+${formatHM(Math.abs(dailyRemaining))} por encima`;
    hoyAccent = 'text-emerald-600 dark:text-emerald-400';
  }

  let semanaSubtext: string;
  let semanaAccent: string;
  if (weeklyRemaining > 0) {
    semanaSubtext = `${formatHM(weeklyRemaining)} para llegar a ${formatHM(weekTargetSec)}`;
    semanaAccent = '';
  } else if (weeklyRemaining === 0) {
    semanaSubtext = '¡Objetivo cumplido!';
    semanaAccent = 'text-emerald-600 dark:text-emerald-400';
  } else {
    semanaSubtext = `+${formatHM(Math.abs(weeklyRemaining))} por encima`;
    semanaAccent = 'text-emerald-600 dark:text-emerald-400';
  }

  let mesSubtext: string;
  let mesAccent: string;
  if (monthlyRemaining > 0) {
    mesSubtext = `${formatHM(monthlyRemaining)} para llegar a ${formatHM(monthTargetSec)}`;
    mesAccent = '';
  } else if (monthlyRemaining === 0) {
    mesSubtext = '¡Objetivo cumplido!';
    mesAccent = 'text-emerald-600 dark:text-emerald-400';
  } else {
    mesSubtext = `+${formatHM(Math.abs(monthlyRemaining))} por encima`;
    mesAccent = 'text-emerald-600 dark:text-emerald-400';
  }

  const cards: CardData[] = [
    {
      icon: Clock,
      label: 'Hoy',
      segmentTestId: 'segment-hoy',
      barTestId: 'bar-hoy',
      workedStr: formatHM(workedToday),
      subtext: hoySubtext,
      accentClass: hoyAccent,
      percent: hoyPercent,
    },
    {
      icon: Calendar,
      label: 'Semana',
      segmentTestId: 'segment-semana',
      barTestId: 'bar-semana',
      workedStr: formatHM(workedWeek),
      subtext: semanaSubtext,
      accentClass: semanaAccent,
      percent: semanaPercent,
    },
    {
      icon: CalendarDays,
      label: 'Mes',
      segmentTestId: 'segment-mes',
      barTestId: 'bar-mes',
      workedStr: formatHM(workedMonth),
      subtext: mesSubtext,
      accentClass: mesAccent,
      percent: mesPercent,
    },
    {
      icon: Landmark,
      label: 'Balance',
      segmentTestId: 'segment-balance',
      barTestId: 'bar-balance',
      workedStr: formatHM(Math.abs(banco)),
      subtext: banco >= 0 ? 'horas a favor' : 'horas en contra',
      accentClass: banco >= 0 ? 'text-emerald-600 dark:text-emerald-400' : '',
      percent: balancePercent,
      onClick: () => setBalanceSheetOpen(true),
    },
  ];

  return (
    <>
      <div
        className="flex flex-col sm:flex-row gap-3"
        data-testid="period-progress-panel"
      >
        {cards.map((card) => (
          <ProgressCard
            key={card.label}
            card={card}
            onClick={card.onClick}
          />
        ))}
      </div>

      <Sheet open={balanceSheetOpen} onOpenChange={setBalanceSheetOpen}>
        <SheetContent side="right" className="sm:max-w-md w-full">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2">
              <Landmark className="w-4 h-4" />
              Desglose del Balance
            </SheetTitle>
            <p className={`text-sm font-medium ${banco >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {banco >= 0 ? '+' : '-'}{formatHM(Math.abs(banco))} total
            </p>
          </SheetHeader>

          <div className="flex items-center gap-1 mb-4">
            {(['all', 'positive', 'negative'] as const).map((filter) => (
              <Button
                key={filter}
                variant={balanceFilter === filter ? 'default' : 'outline'}
                size="sm"
                className="text-xs"
                onClick={() => setBalanceFilter(filter)}
              >
                {filter === 'all' ? 'Todos' : filter === 'positive' ? 'Positivos' : 'Negativos'}
              </Button>
            ))}
          </div>

          <ScrollArea className="h-[calc(100vh-220px)]">
            {filteredBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {breakdown.length === 0
                  ? 'No hay datos de balance disponibles.'
                  : 'No hay entradas con este filtro.'}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredBreakdown.map((item) => {
                  const deltaColor =
                    item.delta > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : item.delta < 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-muted-foreground';
                  const deltaStr =
                    item.delta === 0
                      ? '0:00'
                      : `${item.delta > 0 ? '+' : '-'}${formatHM(Math.abs(item.delta))}`;
                  return (
                    <div
                      key={item.date}
                      className="flex items-center justify-between text-sm p-2 rounded bg-muted/30"
                    >
                      <span className="text-muted-foreground">
                        {formatBreakdownDate(item.date)}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="tabular-nums">{formatHM(item.worked)}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="tabular-nums text-muted-foreground">
                          {formatHM(item.target)}
                        </span>
                        <span className={`tabular-nums font-medium ${deltaColor}`}>
                          {deltaStr}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
