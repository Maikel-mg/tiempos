import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertCircle, Loader2, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTimeEntries } from './hooks/useTimeEntries';
import { useAggregatedData } from './hooks/useAggregatedData';
import { PeriodSelector } from './components/PeriodSelector';
import { SummaryCards } from './components/SummaryCards';
import { TaskBreakdownTable } from './components/TaskBreakdownTable';
import type { PeriodType, DateRange } from './types';
import type { TimeEntry } from '@/lib/types';

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
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start: firstDay, end: lastDay };
    }
    case 'last-month': {
      const firstDay = new Date(now.getFullYear(), now.getMonth() -1, 1);
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

export function DashboardPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodType>('week');
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  
  const dateRange = useMemo(() => getDateRangeForPeriod(period, customRange), [period, customRange]);
  
  const startDateStr = useMemo(() => formatDateForApi(dateRange.start), [dateRange.start]);
  const endDateStr = useMemo(() => formatDateForApi(dateRange.end), [dateRange.end]);
  
  const { data, isLoading, error, refetch } = useTimeEntries({
    startDate: startDateStr,
    endDate: endDateStr
  });
  
  const entries: TimeEntry[] = data?.data || [];
  
  const summary = useAggregatedData(entries, dateRange.start, dateRange.end);
  
  const handlePeriodChange = (newPeriod: PeriodType, newCustomRange?: DateRange) => {
    setPeriod(newPeriod);
    if (newCustomRange) {
      setCustomRange(newCustomRange);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Volver
              </Button>
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <LayoutDashboard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Resumen de Clockify
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
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
              totalSeconds={summary.totalSeconds}
              entriesCount={summary.entriesCount}
              avgPerDaySeconds={summary.avgPerDaySeconds}
            />
            <TaskBreakdownTable tasks={summary.tasksBreakdown} />
          </>
        )}
      </main>
    </div>
  );
}
