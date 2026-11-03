import { formatDurationShort } from '@/lib/format';
import type { TimeEntry } from '@/features/time-tracker/types';
import type { EntryActions } from '../types';
import { taskColor } from '../lib/taskColor';
import { EntryActionsMenu } from './EntryActionsMenu';

interface AgendaEntryRowProps {
  entry: TimeEntry;
  isLive: boolean;
  isActive: boolean;
  actions?: EntryActions;
}

/** Una entrada de la Agenda: horas a la izquierda, Tarea y descripción completa. */
export function AgendaEntryRow({ entry, isLive, isActive, actions }: AgendaEntryRowProps) {
  const color = taskColor(entry.taskName);

  return (
    <div
      role="button"
      aria-label={`Editar ${entry.taskName}`}
      data-plan-active={isActive ? 'true' : undefined}
      tabIndex={isActive ? 0 : -1}
      onClick={() => !isLive && actions?.onEdit?.(entry)}
      onKeyDown={(event) => {
        if (!isLive && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          actions?.onEdit?.(entry);
        }
      }}
      className={`group -mx-2 flex gap-3 rounded-lg px-2 py-2.5 ${
        isActive ? 'bg-primary/5 ring-2 ring-primary' : ''
      } ${isLive ? '' : 'cursor-pointer hover:bg-muted/40'}`}
    >
      <div className="w-16 shrink-0 text-right">
        <p className="font-mono text-sm font-medium tabular-nums leading-tight">{entry.startTime}</p>
        <p className="font-mono text-[11px] tabular-nums leading-tight text-muted-foreground">{entry.endTime}</p>
      </div>

      <div className={`min-w-0 flex-1 border-l-2 pl-3 ${color.accent}`}>
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate font-medium leading-snug">
            {entry.taskName}
            {isLive && (
              <span className="ml-2 inline-flex items-center gap-1 rounded bg-red-500/15 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                en curso
              </span>
            )}
          </p>
          <span
            className={`shrink-0 font-mono text-xs ${
              isLive ? 'font-medium text-red-600 dark:text-red-400' : 'text-muted-foreground'
            }`}
          >
            {formatDurationShort(entry.duration)}
          </span>
        </div>

        {entry.description ? (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{entry.description}</p>
        ) : (
          <p className="mt-1 text-sm italic text-muted-foreground/60">Sin descripción</p>
        )}

        <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
          {entry.recoverable && (
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-700 dark:text-amber-400">permiso</span>
          )}
          <span
            className={
              isLive
                ? 'text-red-600 dark:text-red-400'
                : entry.synced
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : ''
            }
          >
            {isLive ? 'timer activo' : entry.synced ? 'sincronizado' : 'pendiente'}
          </span>
          {isLive ? (
            <button
              onClick={(event) => {
                event.stopPropagation();
                actions?.onSplitTimer?.();
              }}
              disabled={!actions?.onSplitTimer || Boolean(actions.timerSplitReason)}
              title={actions?.timerSplitReason ?? 'Dividir el timer en curso'}
              className="ml-auto normal-case tracking-normal underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50 disabled:hover:no-underline"
            >
              Dividir
            </button>
          ) : (
            <div className="ml-auto opacity-0 transition group-hover:opacity-100">
              <EntryActionsMenu entry={entry} actions={actions ?? {}} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
