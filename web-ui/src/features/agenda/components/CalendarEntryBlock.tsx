import { parseHHMM } from '@/lib/format';
import { taskColor } from '../lib/taskColor';
import type { HourAxis } from '../hooks/useHourAxis';
import type { EntryActions } from '../types';
import type { TimeEntry } from '@/features/time-tracker/types';
import { EntryActionsMenu } from './EntryActionsMenu';
import { HOUR_PX } from './CalendarDayColumn';

interface CalendarEntryBlockProps {
  entry: TimeEntry;
  axis: HourAxis;
  isLive: boolean;
  isActive: boolean;
  actions?: EntryActions;
}

/** Bloque de un Registro de tiempo dentro de una columna del Calendario. */
export function CalendarEntryBlock({ entry, axis, isLive, isActive, actions }: CalendarEntryBlockProps) {
  const start = parseHHMM(entry.startTime);
  const end = parseHHMM(entry.endTime);
  const blockHeight = Math.max(20, ((end - start) / 60) * HOUR_PX - 2);
  const color = taskColor(entry.taskName);

  return (
    <div
      role="button"
      data-plan-active={isActive ? 'true' : undefined}
      tabIndex={isActive ? 0 : -1}
      onClick={(event) => {
        event.stopPropagation();
        if (!isLive) actions?.onEdit?.(entry);
      }}
      onKeyDown={(event) => {
        if (!isLive && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          actions?.onEdit?.(entry);
        }
      }}
      title={`${entry.startTime}–${entry.endTime} · ${entry.taskName}\n${entry.description ?? ''}`}
      className={`group absolute inset-x-1 z-10 overflow-hidden rounded-md border px-1.5 py-1 text-left transition hover:z-30 hover:ring-2 hover:ring-ring ${color.block} ${
        isLive ? 'border-2 border-dashed border-red-500/70 ring-1 ring-red-500/20' : ''
      } ${isActive ? 'z-30 ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}`}
      style={{ top: axis.topOf(start, HOUR_PX), height: blockHeight }}
    >
      <span className="block pr-5 font-mono text-[10px] leading-none opacity-70">
        {entry.startTime}–{entry.endTime}
        {isLive ? (
          <span className="ml-1 font-sans text-[9px] font-semibold uppercase text-red-600 dark:text-red-400">
            en curso
          </span>
        ) : (
          !entry.synced && <span className="ml-1 text-[9px]">●</span>
        )}
      </span>
      <span className="mt-0.5 block truncate text-[11px] font-medium leading-tight">{entry.taskName}</span>
      {!isLive && (
        <div
          className="absolute right-0 top-0 opacity-0 transition group-hover:opacity-100"
          onClick={(event) => event.stopPropagation()}
        >
          <EntryActionsMenu entry={entry} actions={actions ?? {}} className="h-5 w-5" />
        </div>
      )}
      {blockHeight > 52 && entry.description && (
        <span className="mt-0.5 block overflow-hidden text-[10px] leading-tight opacity-75 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
          {entry.description}
        </span>
      )}
    </div>
  );
}
