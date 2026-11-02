import { formatDayShort, taskLanes, todayKey } from '../lib/planRange';
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
    </div>
  );
}
