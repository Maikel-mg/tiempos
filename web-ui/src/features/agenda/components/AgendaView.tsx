import { Plus } from 'lucide-react';
import { formatDurationShort } from '@/lib/format';
import { gapsOf, sortByStart, todayKey, totalSeconds } from '../lib/planRange';
import { formatDayLong } from '../lib/planRange';
import type { PlanViewProps } from '../types';
import { AgendaEntryRow } from './AgendaEntryRow';
import { SyncDayButton } from './SyncDayButton';

interface AgendaViewProps extends PlanViewProps {
  /** Abre el compositor en un hueco concreto, con las horas ya puestas. */
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
          Usá la barra del Timer de arriba para empezar, o hacé clic en un hueco del día en la vista Calendario.
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
                return (
                  <li key={entry.id}>
                    {gap !== undefined && index > 0 && (
                      <button
                        onClick={() => onAdd?.(day, dayEntries[index - 1].endTime, entry.startTime)}
                        className="my-0.5 flex w-full items-center gap-1 rounded py-1 pl-[76px] text-left text-[11px] text-muted-foreground/80 transition hover:bg-muted/60 hover:text-foreground"
                      >
                        <Plus className="h-3 w-3" />
                        {formatGap(gap)} sin registrar
                      </button>
                    )}
                    <AgendaEntryRow
                      entry={entry}
                      isLive={entry.id === timerEntryId}
                      isActive={entry.id === activeEntryId && entry.id !== timerEntryId}
                      actions={actions}
                    />
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
