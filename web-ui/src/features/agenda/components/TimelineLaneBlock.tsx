import { parseHHMM } from '@/lib/format';
import { taskColor } from '../lib/taskColor';
import type { HourAxis } from '../hooks/useHourAxis';
import type { EntryActions } from '../types';
import type { TimeEntry } from '@/features/time-tracker/types';
import { EntryActionsMenu } from './EntryActionsMenu';

interface TimelineLaneBlockProps {
  entry: TimeEntry;
  axis: HourAxis;
  isLive: boolean;
  isActive: boolean;
  actions?: EntryActions;
}

/** Bloque de un Registro de tiempo dentro del carril de su Tarea. */
export function TimelineLaneBlock({ entry, axis, isLive, isActive, actions }: TimelineLaneBlockProps) {
  const color = taskColor(entry.taskName);
  const start = parseHHMM(entry.startTime);
  const end = parseHHMM(entry.endTime);

  return (
    <button
      data-plan-active={isActive ? 'true' : undefined}
      onClick={(event) => {
        event.stopPropagation();
        if (!isLive) actions?.onEdit?.(entry);
      }}
      title={`${entry.startTime}–${entry.endTime} · ${entry.taskName}\n${entry.description ?? ''}`}
      className={`group absolute inset-y-1.5 overflow-hidden rounded-md px-2 text-left text-[10px] font-medium text-white transition hover:brightness-110 ${color.bar} ${
        isLive ? 'border-2 border-dashed border-red-300 ring-2 ring-red-500/50' : ''
      } ${isActive ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}`}
      style={{
        ...color.style,
        left: `${axis.pct(start)}%`,
        width: `${Math.max(1.5, axis.pct(end) - axis.pct(start))}%`,
      }}
    >
      <span className="block truncate pr-4">
        {entry.startTime}–{entry.endTime}
        {isLive && <span className="ml-1 text-[9px]">● en curso</span>}
      </span>
      {entry.description && <span className="block truncate pr-4 opacity-80">{entry.description}</span>}
      {!isLive && (
        <span
          className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 transition group-hover:opacity-100"
          onClick={(event) => event.stopPropagation()}
        >
          <EntryActionsMenu
            entry={entry}
            actions={actions ?? {}}
            className="h-5 w-5 text-white/80 hover:bg-black/20 hover:text-white"
          />
        </span>
      )}
    </button>
  );
}
