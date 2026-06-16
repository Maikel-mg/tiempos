import { useState, useMemo } from 'react';
import { RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTimeEntries } from './hooks/useTimeEntries';
import { useAggregatedData } from './hooks/useAggregatedData';
import { PeriodSelector } from '@/components/shared/PeriodSelector';
import type { PeriodType, DateRange } from '@/components/shared/PeriodSelector';
import { SummaryCards } from './components/SummaryCards';
import { TaskBreakdownTable } from './components/TaskBreakdownTable';
import { DayGroupedEntries } from './components/DayGroupedEntries';
import { WeeklyHoursChart } from './components/WeeklyHoursChart';
import { ProjectDistribution } from './components/ProjectDistribution';
import type { TimeEntry } from '@/lib/types';

function parseISO8601Duration(durationString: string | number | undefined | null): number {
  if (!durationString) return 0;
  if (typeof durationString === 'number') return durationString;
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const match = String(durationString).match(regex);
  if (!match) return 0;
  return (
    (parseInt(match[1] || '0', 10) * 3600) +
    (parseInt(match[2] || '0', 10) * 60) +
    parseInt(match[3] || '0', 10)
  );
}

function getDateRangeForPeriod(period: PeriodType, customRange?: DateRange): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'today':
      return { start: today, end: now };
    case 'week': {
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(today);
      monday.setDate(today.getDate() - diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return { start: monday, end: sunday };
    }
    case 'month': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start: firstDay, end: lastDay };
    }
    case 'last-month': {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start: firstDay, end: lastDay };
    }
    case 'custom':
      return customRange || { start: today, end: now };
    default:
      return { start: today, end: now };
  }
}

function formatDateForApi(date: Date): string {
  return date.toISOString().split('T')[0];
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getExpectedDailySeconds(date: Date): number {
  const day = date.getDay();
  const jsDay = day === 0 ? 6 : day - 1;
  if (jsDay >= 5) return 0;
  return jsDay < 4 ? 8.25 * 3600 : 7 * 3600;
}

function getWorkingDaysBetween(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(23, 59, 59, 999);
  while (current <= endDate) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return Math.max(count, 1);
}

export function DashboardPage() {
  const [period, setPeriod] = useState<PeriodType>('week');
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);

  const dateRange = useMemo(() => getDateRangeForPeriod(period, customRange), [period, customRange]);
  const startDateStr = useMemo(() => formatDateForApi(dateRange.start), [dateRange.start]);
  const endDateStr = useMemo(() => formatDateForApi(dateRange.end), [dateRange.end]);

  const { data, isLoading, error, refetch } = useTimeEntries({
    startDate: startDateStr,
    endDate: endDateStr,
  });

  const entries: TimeEntry[] = data?.data || [];
  const summary = useAggregatedData(entries, dateRange.start, dateRange.end);

  const { hoursToday, hoursWeek, hoursMonth, balance, expectedDailySeconds } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let todaySec = 0;
    let weekSec = 0;
    let monthSec = 0;

    for (const entry of entries) {
      const start = entry.timeInterval?.start;
      if (!start) continue;
      const secs = parseISO8601Duration(entry.timeInterval?.duration);
      const entryDate = new Date(start);

      if (isSameDay(entryDate, today)) {
        todaySec += secs;
      }

      const inRange = entryDate >= dateRange.start && entryDate <= dateRange.end;
      if (inRange) {
        weekSec += secs;
      }

      const entryMonth = new Date(entryDate.getFullYear(), entryDate.getMonth(), 1);
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      if (entryMonth.getTime() === currentMonth.getTime()) {
        monthSec += secs;
      }
    }

    const expectedDaily = getExpectedDailySeconds(now);
    const workingDays = getWorkingDaysBetween(dateRange.start, dateRange.end);
    const expectedTotal = expectedDaily * workingDays;
    const balanceSec = weekSec - expectedTotal;

    return {
      hoursToday: todaySec,
      hoursWeek: weekSec,
      hoursMonth: monthSec,
      balance: balanceSec,
      expectedDailySeconds: expectedDaily,
    };
  }, [entries, dateRange]);

  const handlePeriodChange = (newPeriod: PeriodType, newCustomRange?: DateRange) => {
    setPeriod(newPeriod);
    if (newCustomRange) {
      setCustomRange(newCustomRange);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <Card>
        <CardContent className="pt-6">
          <PeriodSelector
            value={period}
            customRange={customRange}
            onChange={handlePeriodChange}
          />
        </CardContent>
      </Card>

      {isLoading && !entries.length ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Cargando datos...</span>
        </div>
      ) : error ? (
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive mb-4">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Error al cargar datos</span>
            </div>
            <p className="text-muted-foreground mb-4">{error.message}</p>
            <Button onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <SummaryCards
            hoursToday={hoursToday}
            hoursWeek={hoursWeek}
            hoursMonth={hoursMonth}
            balance={balance}
            expectedDailySeconds={expectedDailySeconds}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <WeeklyHoursChart entries={entries} dateRange={dateRange} />
            </div>
            <div className="lg:col-span-1">
              <ProjectDistribution tasks={summary.tasksBreakdown} />
            </div>
          </div>

          <DayGroupedEntries entries={entries} />
          <TaskBreakdownTable tasks={summary.tasksBreakdown} />
        </>
      )}
    </div>
  );
}
