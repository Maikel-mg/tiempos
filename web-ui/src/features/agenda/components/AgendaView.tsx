import { Plus } from 'lucide-react';
import { formatDurationShort } from '@/lib/format';
import { taskColor } from '../lib/taskColor';
import { EntryActionsMenu, type EntryActions } from './EntryActionsMenu';
import { SyncDayButton } from './SyncDayButton';
import {
  formatDayLong,
  gapsOf,
  sortByStart,
  todayKey,
  totalSeconds,
  type PlanMode,
} from '../lib/planRange';
import type { TimeEntry } from '@/features/time-tracker/types';

interface AgendaViewProps {
  entries: TimeEntry[];
  days: string[];
  mode: PlanMode;
  timerEntryId?: string;
  activeEntryId?: string;
  actions?: EntryActions;
  onPickDay?: (day: string) => void;
  /** Abre el compositor en un hueco concreto (horas ya puestas). */
  onAdd?: (day: string, startTime: string, endTime: string) => void;
  /** Abre el compositor al final del día. */
  onAddAfterDay?: (day: string) => void;
  onSyncDay?: (ids: string[]) => void;
}

function formatGap(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/**
 * Agenda: la lectura cronológica del día. Hora de inicio sobre hora de fin a la
 * izquierda, Tarea y descripción completa a la derecha, duración al final, y los
 * huecos entre Registros de tiempo marcados con lo que falta por registrar.
 */
export function AgendaView({
  entries,
  days,
  mode,
  timerEntryId,
  activeEntryId,
  actions,
  onPickDay,
  onAdd,
  onAddAfterDay,
  onSyncDay,
}: AgendaViewProps) {
  const today = todayKey();
  const visibleDays = days.filter((day) => mode === 'day' || entries.some((entry) => entry.date === day));

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border bg-card px-6 py-10 text-center">
        <p className="text-sm font-medium">No hay Registros de tiempo en este período</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Usá la barra del Timer de arriba para empezar, o hacé clic en un hueco del día en la vista Timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y rounded-xl border bg-card">
      {visibleDays.map((day) => {
        const dayEntries = sortByStart(entries.filter((entry) => entry.date === day));
        const gaps = gapsOf(dayEntries);
        return (
          <section key={day} className="px-4 py-3 sm:px-6">
            <header className="mb-1 flex items-baseline justify-between gap-2 border-b border-dashed pb-1.5">
              <h3 className="text-sm font-semibold capitalize">
                <button onClick={() => onPickDay?.(day)} className="hover:underline" title="Ver este día">
                  {formatDayLong(day)}
                </button>
                {day === today && (
                  <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    hoy
                  </span>
                )}
              </h3>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {dayEntries.length} reg · {formatDurationShort(totalSeconds(dayEntries))}
                </span>
                <button
                  onClick={() => onAddAfterDay?.(day)}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  title="Añadir Registro de tiempo a este día"
                >
                  <Plus className="h-3 w-3" /> añadir
                </button>
                {onSyncDay && <SyncDayButton entries={dayEntries} onSyncDay={onSyncDay} />}
              </div>
            </header>

            {dayEntries.length === 0 && (
              <p className="py-4 text-sm text-muted-foreground">Nada registrado este día.</p>
            )}

            <ul>
              {dayEntries.map((entry, index) => {
                const gap = gaps.get(entry.id);
                const color = taskColor(entry.taskName);
                const isLive = entry.id === timerEntryId;
                const isActive = entry.id === activeEntryId && !isLive;
                return (
                  <li key={entry.id}>
                    {gap !== undefined && (
                      <button
                        onClick={() =>
                          onAdd?.(day, dayEntries[index - 1].endTime, entry.startTime)
                        }
                        className="my-0.5 flex w-full items-center gap-1 rounded py-1 pl-[76px] text-left text-[11px] text-muted-foreground/80 transition hover:bg-muted/60 hover:text-foreground"
                      >
                        <Plus className="h-3 w-3" />
                        {formatGap(gap)} sin registrar
                      </button>
                    )}
                    <div
                      data-plan-active={isActive ? 'true' : undefined}
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => !isLive && actions?.onEdit?.(entry)}
                      className={`group -mx-2 flex gap-3 rounded-lg px-2 py-2.5 ${
                        isActive ? 'bg-primary/5 ring-2 ring-primary' : ''
                      } ${isLive ? '' : 'cursor-pointer hover:bg-muted/40'}`}
                    >
                      <div className="w-16 shrink-0 text-right">
                        <p className="font-mono text-sm font-medium tabular-nums leading-tight">{entry.startTime}</p>
                        <p className="font-mono text-[11px] tabular-nums leading-tight text-muted-foreground">
                          {entry.endTime}
                        </p>
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
                            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-700 dark:text-amber-400">
                              permiso
                            </span>
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
                          {!isLive && (
                            <div className="ml-auto opacity-0 transition group-hover:opacity-100">
                              <EntryActionsMenu entry={entry} actions={actions ?? {}} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
