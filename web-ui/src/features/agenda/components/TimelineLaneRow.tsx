import { Plus } from 'lucide-react';
import { formatDurationShort } from '@/lib/format';
import { endOfDay, formatDayShort, minutesToHHMM, sortByStart, totalSeconds } from '../lib/planRange';
import { taskColor } from '../lib/taskColor';
import type { HourAxis } from '../hooks/useHourAxis';
import type { PlanMode, TaskLane } from '../lib/planRange';
import type { PlanViewProps } from '../types';
import { TimelineLaneBlock } from './TimelineLaneBlock';

/** Referencia honesta para el ancho de la barra en modo semana: 8 h = celda llena. */
const DAY_REFERENCE_SECONDS = 8 * 3600;

interface TimelineLaneRowProps {
  lane: TaskLane;
  days: string[];
  mode: PlanMode;
  axis: HourAxis;
  timerEntryId?: string;
  activeEntryId?: string;
  actions?: PlanViewProps['actions'];
  onAdd?: (day: string, startTime: string, preset?: { proceso: number; nombre: string }) => void;
}

/** Una fila del Timeline: el tiempo de una Tarea repartido por el período. */
export function TimelineLaneRow({
  lane,
  days,
  mode,
  axis,
  timerEntryId,
  activeEntryId,
  actions,
  onAdd,
}: TimelineLaneRowProps) {
  const color = taskColor(lane.taskName);
  const cursorDay = days[0];

  return (
    <div className="flex border-b last:border-b-0">
      <div className="flex w-48 shrink-0 items-center justify-between gap-2 border-r px-3 py-2">
        <span
          className={`min-w-0 truncate text-xs font-medium ${color.text}`}
          style={color.style}
          title={lane.taskName}
        >
          {lane.taskName}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
          {formatDurationShort(lane.total)}
        </span>
        <button
          onClick={() =>
            onAdd?.(cursorDay, endOfDay(lane.byDay.get(cursorDay) ?? []), {
              proceso: lane.taskId,
              nombre: lane.taskName,
            })
          }
          title={`Añadir Registro de tiempo de ${lane.taskName}`}
          aria-label={`Añadir Registro de tiempo de ${lane.taskName}`}
          className="shrink-0 rounded p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {mode === 'week' ? (
        <div className="relative h-12 flex-1">
          {days.map((day, index) => (
            <div
              key={day}
              className={`absolute inset-y-0 border-l border-border/40 ${index === 0 ? 'border-l-0' : ''}`}
              style={{ left: `${(index / days.length) * 100}%` }}
            />
          ))}
          {days.map((day, index) => {
            const dayEntries = lane.byDay.get(day) ?? [];
            if (dayEntries.length === 0) return null;
            const seconds = totalSeconds(dayEntries);
            const width = Math.min(100, Math.max(12, (seconds / DAY_REFERENCE_SECONDS) * 100));
            return (
              <button
                key={day}
                onClick={() => actions?.onEdit?.(sortByStart(dayEntries)[0])}
                title={`${formatDayShort(day)} · ${formatDurationShort(seconds)}`}
                className="absolute inset-y-1.5 -translate-x-1/2 rounded-md px-1 text-[10px] font-medium text-white"
                style={{
                  left: `${((index + 0.5) / days.length) * 100}%`,
                  width: `${width}%`,
                  maxWidth: `${100 / days.length}%`,
                }}
              >
                <span
                  className={`flex h-full items-center justify-center rounded-md ${color.bar} px-1`}
                  style={color.style}
                >
                  {formatDurationShort(seconds)}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div
          className="relative h-12 flex-1"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const minutes = axis.from + ((event.clientX - rect.left) / rect.width) * axis.span;
            onAdd?.(cursorDay, minutesToHHMM(Math.round(minutes / 15) * 15), {
              proceso: lane.taskId,
              nombre: lane.taskName,
            });
          }}
        >
          {axis.hours.map((hour) => (
            <div
              key={hour}
              className="absolute inset-y-0 border-l border-border/30"
              style={{ left: `${axis.pct(hour * 60)}%` }}
            />
          ))}
          {sortByStart(lane.byDay.get(cursorDay) ?? []).map((entry) => (
            <TimelineLaneBlock
              key={entry.id}
              entry={entry}
              axis={axis}
              isLive={entry.id === timerEntryId}
              isActive={entry.id === activeEntryId}
              actions={actions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
