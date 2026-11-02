import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { formatDurationShort, parseHHMM } from '@/lib/format';
import { taskColor } from '../lib/taskColor';
import { EntryActionsMenu, type EntryActions } from './EntryActionsMenu';
import {
  formatDayLong,
  formatDayShort,
  hourBounds,
  minutesToHHMM,
  sortByStart,
  todayKey,
  totalSeconds,
  type PlanMode,
} from '../lib/planRange';
import type { TimeEntry } from '@/features/time-tracker/types';

const HOUR_PX = 64;

interface TimelineViewProps {
  entries: TimeEntry[];
  days: string[];
  mode: PlanMode;
  /** Hora de entrada de la jornada, en minutos desde medianoche. */
  workdayStart: number | null;
  /** Registro virtual del Timer activo: se pinta como bloque vivo, no editable. */
  timerEntryId?: string;
  /** Registro de tiempo resaltado por la navegación de teclado. */
  activeEntryId?: string;
  actions?: EntryActions;
  onPickDay?: (day: string) => void;
  /** Abre el compositor en el hueco pulsado (hora ya calculada desde el puntero). */
  onAddAt?: (day: string, startTime: string) => void;
  onAddAfterDay?: (day: string) => void;
}

export function TimelineView({
  entries,
  days,
  mode,
  workdayStart,
  timerEntryId,
  activeEntryId,
  actions,
  onPickDay,
  onAddAt,
  onAddAfterDay,
}: TimelineViewProps) {
  const { from, to } = useMemo(() => hourBounds(entries, workdayStart), [entries, workdayStart]);
  const height = ((to - from) / 60) * HOUR_PX;
  const hours = Array.from({ length: Math.round((to - from) / 60) }, (_, index) => from / 60 + index);
  const today = todayKey();
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const showNowLine = nowMinutes >= from && nowMinutes <= to;

  const topOf = (minutes: number) => ((minutes - from) / 60) * HOUR_PX;

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex max-h-[70vh] overflow-y-auto">
        <div className="w-14 shrink-0 border-r bg-muted/30">
          <div className="h-11 border-b" />
          <div className="relative" style={{ height }}>
            {hours.map((hour) => (
              <span
                key={hour}
                className="absolute right-1.5 -translate-y-1/2 font-mono text-[10px] text-muted-foreground"
                style={{ top: topOf(hour * 60) }}
              >
                {String(hour).padStart(2, '0')}:00
              </span>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-1">
          {days.map((day) => {
            const dayEntries = sortByStart(entries.filter((entry) => entry.date === day));
            const isToday = day === today;
            return (
              <div key={day} className="min-w-0 flex-1 border-r last:border-r-0">
                <div
                  className={`flex h-11 items-center gap-1 border-b px-1 ${
                    isToday ? 'bg-primary/5' : 'bg-muted/20'
                  }`}
                >
                  <button
                    onClick={() => onPickDay?.(day)}
                    className="min-w-0 text-left text-xs font-medium capitalize hover:underline"
                    title="Ver este día"
                  >
                    <span className="block truncate">
                      {mode === 'week' ? formatDayShort(day) : formatDayLong(day)}
                    </span>
                    <span className="block font-mono text-[10px] font-normal text-muted-foreground">
                      {formatDurationShort(totalSeconds(dayEntries))}
                    </span>
                  </button>
                  <button
                    onClick={() => onAddAfterDay?.(day)}
                    title="Añadir Registro de tiempo"
                    aria-label={`Añadir Registro de tiempo el ${formatDayShort(day)}`}
                    className="ml-auto shrink-0 rounded p-0.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div
                  className="relative"
                  style={{ height }}
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const minutes = from + ((event.clientY - rect.top) / HOUR_PX) * 60;
                    onAddAt?.(day, minutesToHHMM(Math.round(minutes / 15) * 15));
                  }}
                >
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className={`absolute inset-x-0 border-t ${hour % 6 === 0 ? 'border-border/60' : 'border-border/25'}`}
                      style={{ top: topOf(hour * 60) }}
                    />
                  ))}

                  {isToday && showNowLine && (
                    <div
                      className="absolute inset-x-0 z-20 border-t-2 border-red-500/80"
                      style={{ top: topOf(nowMinutes) }}
                    >
                      <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
                    </div>
                  )}

                  {dayEntries.map((entry) => {
                    const isLive = entry.id === timerEntryId;
                    const isActive = entry.id === activeEntryId;
                    const start = parseHHMM(entry.startTime);
                    const end = parseHHMM(entry.endTime);
                    const blockHeight = Math.max(20, ((end - start) / 60) * HOUR_PX - 2);
                    const color = taskColor(entry.taskName);
                    return (
                      <div
                        key={entry.id}
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
                        style={{ top: topOf(start), height: blockHeight }}
                      >
                        <span className="block font-mono text-[10px] leading-none opacity-70">
                          {entry.startTime}–{entry.endTime}
                          {isLive ? (
                            <span className="ml-1 font-sans text-[9px] font-semibold uppercase text-red-600 dark:text-red-400">
                              en curso
                            </span>
                          ) : (
                            !entry.synced && <span className="ml-1 text-[9px]">●</span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] font-medium leading-tight">
                          {entry.taskName}
                        </span>
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
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
