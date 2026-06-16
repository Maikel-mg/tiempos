import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { TimeEntry } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

function formatDurationDecimal(seconds: number): string {
  return (seconds / 3600).toFixed(1);
}

function getDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr);
  const jsDay = d.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

function getDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toISOString().split('T')[0];
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

interface WeeklyHoursChartProps {
  entries: TimeEntry[];
  dateRange: { start: Date; end: Date };
}

interface DayData {
  day: string;
  label: string;
  hours: number;
  expected: number;
}

export function WeeklyHoursChart({ entries, dateRange }: WeeklyHoursChartProps) {
  const chartData = useMemo(() => {
    const monday = getMondayOfWeek(dateRange.start);
    const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    const daySecondsMap: Record<number, number> = {};
    for (const entry of entries) {
      const start = entry.timeInterval?.start;
      if (!start) continue;
      const key = getDateKey(start);
      const mondayKey = getDateKey(monday.toISOString());
      const entryDate = new Date(key);
      const entryMonday = getMondayOfWeek(entryDate);
      if (getDateKey(entryMonday.toISOString()) !== mondayKey) continue;
      const dayIdx = getDayOfWeek(start);
      daySecondsMap[dayIdx] = (daySecondsMap[dayIdx] || 0) + parseISO8601Duration(entry.timeInterval?.duration);
    }

    const data: DayData[] = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      const isWeekend = i >= 5;
      const expected = isWeekend ? 0 : i < 4 ? 8.25 : 7;
      data.push({
        day: dayLabels[i],
        label: dayLabels[i],
        hours: (daySecondsMap[i] || 0) / 3600,
        expected,
      });
    }

    return data;
  }, [entries, dateRange]);

  const maxHours = Math.max(...chartData.map(d => d.hours), ...chartData.map(d => d.expected), 10);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: DayData }> }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-card border border-border/50 rounded-lg px-3 py-2 shadow-lg">
        <p className="text-xs font-medium text-muted-foreground mb-1">{d.label}</p>
        <p className="font-mono font-semibold text-foreground tabular-nums">
          {formatDurationDecimal(d.hours)}h
        </p>
        {d.expected > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Esperado: {d.expected}h
          </p>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Horas por Día
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 0, left: -16, bottom: 0 }}
              barCategoryGap="20%"
            >
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                dy={4}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                domain={[0, Math.ceil(maxHours * 1.1)]}
                tickFormatter={(v: number) => `${v}`}
                dx={-4}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
              />
              <Bar
                dataKey="hours"
                fill="hsl(var(--chart-1))"
                radius={[3, 3, 0, 0]}
                maxBarSize={40}
                name="Horas"
              />
              <ReferenceLine
                y={8.25}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{
                  value: '8.25h',
                  position: 'right',
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 10,
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
