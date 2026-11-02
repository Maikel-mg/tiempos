import { formatDayLong, formatDayShort } from '../lib/planRange';
import { useHourAxis } from '../hooks/useHourAxis';
import type { PlanViewProps } from '../types';
import { CalendarDayColumn, HOUR_PX } from './CalendarDayColumn';

interface CalendarViewProps extends PlanViewProps {
  /** Abre el compositor en el hueco pulsado (hora calculada desde el puntero). */
  onAddAt?: (day: string, startTime: string) => void;
  onAddAfterDay?: (day: string) => void;
  onSyncDay?: (ids: string[]) => void;
}

/**
 * Calendario: la rejilla del período con regla horaria.
 *
 * Cada Registro de tiempo se pinta como bloque proporcional a su duración y
 * posicionado por su hora real. En modo semana, una columna por día laborable.
 */
export function CalendarView({ entries, days, mode, workdayStart, ...columnProps }: CalendarViewProps) {
  const axis = useHourAxis(entries, workdayStart);
  const height = ((axis.to - axis.from) / 60) * HOUR_PX;

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex max-h-[70vh] overflow-y-auto">
        <div className="w-14 shrink-0 border-r bg-muted/30">
          <div className="h-11 border-b" />
          <div className="relative" style={{ height }}>
            {axis.hours.map((hour) => (
              <span
                key={hour}
                className="absolute right-1.5 -translate-y-1/2 font-mono text-[10px] text-muted-foreground"
                style={{ top: axis.topOf(hour * 60, HOUR_PX) }}
              >
                {String(hour).padStart(2, '0')}:00
              </span>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-1">
          {days.map((day) => (
            <CalendarDayColumn
              key={day}
              day={day}
              label={mode === 'week' ? formatDayShort(day) : formatDayLong(day)}
              entries={entries.filter((entry) => entry.date === day)}
              axis={axis}
              {...columnProps}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
