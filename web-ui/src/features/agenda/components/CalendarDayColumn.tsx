import { Plus } from 'lucide-react';
import { formatDurationShort } from '@/lib/format';
import { sortByStart, todayKey, totalSeconds, minutesToHHMM } from '../lib/planRange';
import type { HourAxis } from '../hooks/useHourAxis';
import type { EntryActions } from '../types';
import type { TimeEntry } from '@/features/time-tracker/types';
import { CalendarEntryBlock } from './CalendarEntryBlock';
import { SyncDayButton } from './SyncDayButton';

export const HOUR_PX = 64;

interface CalendarDayColumnProps {
  day: string;
  /** Etiqueta de la cabecera: día largo, o corto en modo semana. */
  label: string;
  entries: TimeEntry[];
  axis: HourAxis;
  timerEntryId?: string;
  activeEntryId?: string;
  actions?: EntryActions;
  onPickDay?: (day: string) => void;
  onAddAt?: (day: string, startTime: string) => void;
  onAddAfterDay?: (day: string) => void;
  onSyncDay?: (ids: string[]) => void;
}

/** Columna de un día en el Calendario: cabecera, regla horaria y bloques. */
export function CalendarDayColumn({
  day,
  label,
  entries,
  axis,
  timerEntryId,
  activeEntryId,
  actions,
  onPickDay,
  onAddAt,
  onAddAfterDay,
  onSyncDay,
}: CalendarDayColumnProps) {
  const dayEntries = sortByStart(entries);
  const isToday = day === todayKey();
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const showNowLine = nowMinutes >= axis.from && nowMinutes <= axis.to;
  const height = ((axis.to - axis.from) / 60) * HOUR_PX;

  return (
    <div className="min-w-0 flex-1 border-r last:border-r-0">
      <div className={`flex h-11 items-center gap-1 border-b px-1 ${isToday ? 'bg-primary/5' : 'bg-muted/20'}`}>
        <button
          onClick={() => onPickDay?.(day)}
          className="min-w-0 text-left text-xs font-medium capitalize hover:underline"
          title="Ver este día"
        >
          <span className="block truncate capitalize">{label}</span>
          <span className="block font-mono text-[10px] font-normal text-muted-foreground">
            {formatDurationShort(totalSeconds(dayEntries))}
          </span>
        </button>
        <button
          onClick={() => onAddAfterDay?.(day)}
          title="Añadir Registro de tiempo"
          aria-label={`Añadir Registro de tiempo el ${day}`}
          className="ml-auto shrink-0 rounded p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        {onSyncDay && <SyncDayButton entries={dayEntries} onSyncDay={onSyncDay} label="" />}
      </div>

      <div
        className="relative"
        style={{ height }}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const minutes = axis.from + ((event.clientY - rect.top) / HOUR_PX) * 60;
          onAddAt?.(day, minutesToHHMM(Math.round(minutes / 15) * 15));
        }}
      >
        {axis.hours.map((hour) => (
          <div
            key={hour}
            className={`absolute inset-x-0 border-t ${hour % 6 === 0 ? 'border-border/60' : 'border-border/25'}`}
            style={{ top: axis.topOf(hour * 60, HOUR_PX) }}
          />
        ))}

        {isToday && showNowLine && (
          <div
            className="absolute inset-x-0 z-20 border-t-2 border-red-500/80"
            style={{ top: axis.topOf(nowMinutes, HOUR_PX) }}
          >
            <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
          </div>
        )}

        {dayEntries.map((entry) => (
          <CalendarEntryBlock
            key={entry.id}
            entry={entry}
            axis={axis}
            isLive={entry.id === timerEntryId}
            isActive={entry.id === activeEntryId}
            actions={actions}
          />
        ))}
      </div>
    </div>
  );
}

