import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatDuration(seconds: number): string {
  const hrs = Math.floor(Math.abs(seconds) / 3600);
  const mins = Math.floor((Math.abs(seconds) % 3600) / 60);
  return `${hrs}:${mins.toString().padStart(2, '0')}`;
}

interface SummaryCardsProps {
  hoursToday: number;
  hoursWeek: number;
  hoursMonth: number;
  balance: number;
  expectedDailySeconds: number;
}

interface StatCardProps {
  label: string;
  value: number;
  accentColor: string;
  subtitle?: string;
}

function StatCard({ label, value, accentColor, subtitle }: StatCardProps) {
  const isPositive = value > 0;
  const isZero = value === 0;

  return (
    <Card
      className="relative overflow-hidden border-l-2"
      style={{ borderLeftColor: accentColor }}
    >
      <CardContent className="pt-5 pb-4 px-5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          {label}
        </p>
        <p className="font-mono font-semibold text-2xl tabular-nums text-foreground">
          {formatDuration(value)}
        </p>
        {subtitle && (
          <div className="flex items-center gap-1.5 mt-2">
            {!isZero && (
              isPositive
                ? <TrendingUp className="h-3 w-3" style={{ color: accentColor }} />
                : <TrendingDown className="h-3 w-3" style={{ color: accentColor }} />
            )}
            {isZero && <Minus className="h-3 w-3 text-muted-foreground" />}
            <span className={cn(
              'text-xs',
              isPositive ? 'text-green-500' : isZero ? 'text-muted-foreground' : 'text-red-500'
            )}>
              {subtitle}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SummaryCards({
  hoursToday,
  hoursWeek,
  hoursMonth,
  balance,
  expectedDailySeconds,
}: SummaryCardsProps) {
  const todayTarget = expectedDailySeconds;
  const weekTarget = expectedDailySeconds * 5;
  const monthTarget = expectedDailySeconds * 22;

  const todayBalance = hoursToday - todayTarget;
  const weekBalance = hoursWeek - weekTarget;
  const monthBalance = hoursMonth - monthTarget;

  function formatBalance(seconds: number): string {
    const sign = seconds >= 0 ? '+' : '-';
    return `${sign}${formatDuration(seconds)}`;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Horas Hoy"
        value={hoursToday}
        accentColor="hsl(var(--chart-1))"
        subtitle={formatBalance(todayBalance)}
      />
      <StatCard
        label="Horas Semana"
        value={hoursWeek}
        accentColor="hsl(var(--chart-2))"
        subtitle={formatBalance(weekBalance)}
      />
      <StatCard
        label="Horas Mes"
        value={hoursMonth}
        accentColor="hsl(var(--chart-3))"
        subtitle={formatBalance(monthBalance)}
      />
      <StatCard
        label="Balance"
        value={balance}
        accentColor={balance >= 0 ? 'hsl(var(--chart-2))' : 'hsl(var(--destructive))'}
        subtitle={balance >= 0 ? 'sobre objetivo' : 'bajo objetivo'}
      />
    </div>
  );
}
