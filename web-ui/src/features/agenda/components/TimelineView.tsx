import { formatDurationShort } from '@/lib/format';
import { computeDailyBalance } from '@/features/time-tracker/lib/balance';
import { getDailyTarget } from '@/features/time-tracker/lib/schedule';
import { useHourAxis } from '../hooks/useHourAxis';
import { formatDayShort, taskLanes, todayKey, totalSeconds } from '../lib/planRange';
import type { PlanViewProps } from '../types';
import { TimelineLaneRow } from './TimelineLaneRow';

/**
 * Estado de un total frente a su objetivo: clase de texto y etiqueta accesible.
 * `balance` es lo trabajado menos el objetivo, sin los Registros de Permiso,
 * igual que el agrupado del time tracker; con objetivo 0 no hay nada que cumplir.
 */
function goalTone(balance: number, target: number): { className: string; label: string } {
  if (target <= 0) return { className: 'text-muted-foreground', label: 'sin objetivo' };
  const reached = balance >= 0;
  return {
    className: reached ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
    label: `${reached ? 'cumple' : 'no cumple'} el objetivo de ${formatDurationShort(target)}`,
  };
}

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

  const totals = days.map((day) => {
    const target = getDailyTarget(day) * 3600;
    const balance = computeDailyBalance(entries, day);
    return {
      day,
      target,
      balance,
      tone: goalTone(balance, target),
      // El número muestra todo lo registrado; el color, lo trabajado sin Permisos.
      seconds: totalSeconds(entries.filter((entry) => entry.date === day)),
    };
  });
  const weekSeconds = totalSeconds(entries);
  const weekTarget = totals.reduce((sum, total) => sum + total.target, 0);
  const weekBalance = totals.reduce((sum, total) => sum + total.balance, 0);
  const weekTone = goalTone(weekBalance, weekTarget);

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
            <span className={weekTone.className} title={`Objetivo de la semana: ${formatDurationShort(weekTarget)}`}>
              {formatDurationShort(weekSeconds)}
              <span className="sr-only">{weekTone.label}</span>
            </span>
          </div>
          <div className="flex flex-1">
            {totals.map(({ day, seconds, target, tone }, index) => (
              <div
                key={day}
                title={`${formatDayShort(day)} · objetivo ${formatDurationShort(target)}`}
                className={`flex flex-1 items-center justify-center py-1.5 ${
                  index === 0 ? '' : 'border-l border-border/40'
                } ${tone.className}`}
              >
                {formatDurationShort(seconds)}
                <span className="sr-only">{tone.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
