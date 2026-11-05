import { formatDayShort, taskLanes, todayKey, totalSeconds } from '../lib/planRange';
import { formatDurationShort } from '@/lib/format';
import { getDailyTarget } from '@/features/time-tracker/lib/schedule';

/** Verde si se alcanza el objetivo del día o de la semana, ámbar si falta. */
function goalColor(seconds: number, target: number): string {
  if (target <= 0) return 'text-muted-foreground';
  return seconds >= target ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400';
}
import { useHourAxis } from '../hooks/useHourAxis';
import type { PlanViewProps } from '../types';
import { TimelineLaneRow } from './TimelineLaneRow';

interface TimelineViewProps extends PlanViewProps {
  /** Abre el compositor con la Tarea del carril ya elegida. */
  onAdd?: (day: string, startTime: string, preset?: { proceso: number; nombre: string }) => void;
}

/**
 * Timeline: el reparto del tiempo por Tarea.
 *
 * Filas por Tarea de mayor a menor tiempo. En modo día el eje horizontal son las
 * horas y cada Registro de tiempo se sitúa en su posición real; en modo semana
 * las columnas son los días laborables y cada celda resume el tiempo dedicado a
 * esa Tarea ese día.
 */
export function TimelineView({ entries, days, mode, workdayStart, ...laneProps }: TimelineViewProps) {
  const lanes = taskLanes(entries);
  const axis = useHourAxis(entries, workdayStart);
  const today = todayKey();

  const secondsByDay = new Map(days.map((day) => [day, totalSeconds(entries.filter((e) => e.date === day))]));
  const targetByDay = new Map(days.map((day) => [day, getDailyTarget(day) * 3600]));
  const weekSeconds = totalSeconds(entries);
  const weekTarget = [...targetByDay.values()].reduce((sum, target) => sum + target, 0);

  if (lanes.length === 0) {
    return (
      <div className="rounded-xl border bg-card px-6 py-10 text-center">
        <p className="text-sm font-medium">No hay Registros de tiempo en este período</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta vista reparte el tiempo por Tarea: aparece en cuanto registres el primero.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex border-b bg-muted/20">
        <div className="w-48 shrink-0 border-r px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Tarea
        </div>
        <div className="relative h-7 flex-1">
          {mode === 'week'
            ? days.map((day, index) => (
                <button
                  key={day}
                  onClick={() => laneProps.onPickDay?.(day)}
                  className={`absolute top-1 -translate-x-1/2 text-[10px] capitalize hover:underline ${
                    day === today ? 'font-semibold text-primary' : 'text-muted-foreground'
                  }`}
                  style={{ left: `${((index + 0.5) / days.length) * 100}%` }}
                >
                  {formatDayShort(day)}
                </button>
              ))
            : axis.hours.map((hour) => (
                <span
                  key={hour}
                  className="absolute top-1 -translate-x-1/2 font-mono text-[10px] text-muted-foreground"
                  style={{ left: `${axis.pct(hour * 60)}%` }}
                >
                  {String(hour).padStart(2, '0')}
                </span>
              ))}
        </div>
      </div>

      {lanes.map((lane) => (
        <TimelineLaneRow key={lane.taskName} lane={lane} days={days} mode={mode} axis={axis} {...laneProps} />
      ))}

      {mode === 'week' && (
        <div className="flex border-t bg-muted/20 font-mono text-[10px] text-muted-foreground">
          <div className="flex w-48 shrink-0 items-center justify-between gap-2 border-r px-3 py-1.5">
            <span className="font-sans font-semibold uppercase tracking-wider text-muted-foreground">Total</span>
            <span
              className={goalColor(weekSeconds, weekTarget)}
              title={`Objetivo de la semana: ${formatDurationShort(weekTarget)}`}
            >
              {formatDurationShort(weekSeconds)}
            </span>
          </div>
          <div className="flex flex-1">
            {days.map((day, index) => {
              const seconds = secondsByDay.get(day) ?? 0;
              const target = targetByDay.get(day) ?? 0;
              return (
                <div
                  key={day}
                  title={`${formatDayShort(day)} · objetivo ${formatDurationShort(target)}`}
                  className={`flex flex-1 items-center justify-center py-1.5 ${
                    index === 0 ? '' : 'border-l border-border/40'
                  } ${goalColor(seconds, target)}`}
                >
                  {formatDurationShort(seconds)}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
