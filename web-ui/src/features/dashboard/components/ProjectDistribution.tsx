import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TaskSummary } from '../types';

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

interface ProjectDistributionProps {
  tasks: TaskSummary[];
}

export function ProjectDistribution({ tasks }: ProjectDistributionProps) {
  const displayTasks = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => b.seconds - a.seconds);
    if (sorted.length <= 8) return sorted;

    const top = sorted.slice(0, 7);
    const rest = sorted.slice(7);
    const otherSeconds = rest.reduce((sum, t) => sum + t.seconds, 0);
    const totalSeconds = sorted.reduce((sum, t) => sum + t.seconds, 0);

    top.push({
      name: 'Otros',
      seconds: otherSeconds,
      percentage: totalSeconds > 0 ? Math.round((otherSeconds / totalSeconds) * 1000) / 10 : 0,
    });
    return top;
  }, [tasks]);

  const maxSeconds = displayTasks.length > 0
    ? Math.max(...displayTasks.map(t => t.seconds))
    : 1;

  if (tasks.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Distribución por Tarea
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[220px]">
          <p className="text-sm text-muted-foreground">Sin datos</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Distribución por Tarea
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayTasks.map((task, i) => {
            const pct = maxSeconds > 0 ? (task.seconds / maxSeconds) * 100 : 0;
            const color = CHART_COLORS[i % CHART_COLORS.length];
            return (
              <div key={task.name} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm truncate">{task.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-sm font-medium tabular-nums">
                      {formatDuration(task.seconds)}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                      {task.percentage}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
