import { useMemo } from 'react';
import { formatDurationShort, parseHHMM } from '@/lib/format';
import { taskColor } from '../lib/taskColor';
import { formatDayShort, hourBounds, sortByStart, todayKey, totalSeconds, taskLanes } from '../lib/planRange';
import type { PlanMode } from '../lib/planRange';
import type { TimeEntry } from '@/features/time-tracker/types';

/** Referencia honesta para el ancho de la barra en modo semana: 8 h = celda llena. */
const DAY_REFERENCE_SECONDS = 8 * 3600;

interface CalendarViewProps {
  entries: TimeEntry[];
  days: string[];
  mode: PlanMode;
  /** Hora de entrada de la jornada, en minutos desde medianoche. */
  workdayStart: number | null;
  timerEntryId?: string;
  activeEntryId?: string;
  onEdit?: (entry: TimeEntry) => void;
  onPickDay?: (day: string) => void;
}

/**
 * Calendario: el reparto del tiempo por Tarea.
 *
 * Filas por Tarea de mayor a menor tiempo. En modo día el eje horizontal son las
 * horas y cada Registro de tiempo se sitúa en su posición real; en modo semana
 * las columnas son los días laborables y cada celda resume el tiempo dedicado a
 * esa Tarea ese día.
 */
export function CalendarView({
  entries,
  days,
  mode,
  workdayStart,
  timerEntryId,
  activeEntryId,
  onEdit,
  onPickDay,
}: CalendarViewProps) {
  const lanes = useMemo(() => taskLanes(entries), [entries]);
  const { from, to } = useMemo(() => hourBounds(entries, workdayStart), [entries, workdayStart]);
  const span = Math.max(1, to - from);
  const hours = Array.from({ length: Math.round(span / 60) }, (_, index) => from / 60 + index);
  const today = todayKey();
  const pct = (minutes: number) => ((minutes - from) / span) * 100;

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
                  onClick={() => onPickDay?.(day)}
                  className={`absolute top-1 -translate-x-1/2 text-[10px] capitalize hover:underline ${
                    day === today ? 'font-semibold text-primary' : 'text-muted-foreground'
                  }`}
                  style={{ left: `${((index + 0.5) / days.length) * 100}%` }}
                >
                  {formatDayShort(day)}
                </button>
              ))
            : hours.map((hour) => (
                <span
                  key={hour}
                  className="absolute top-1 -translate-x-1/2 font-mono text-[10px] text-muted-foreground"
                  style={{ left: `${pct(hour * 60)}%` }}
                >
                  {String(hour).padStart(2, '0')}
                </span>
              ))}
        </div>
      </div>

      {lanes.map((lane) => {
        const color = taskColor(lane.taskName);
        return (
          <div key={lane.taskName} className="flex border-b last:border-b-0">
            <div className="flex w-48 shrink-0 items-center justify-between gap-2 border-r px-3 py-2">
              <span className={`min-w-0 truncate text-xs font-medium ${color.text}`} title={lane.taskName}>
                {lane.taskName}
              </span>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                {formatDurationShort(lane.total)}
              </span>
            </div>

            <div className="relative h-12 flex-1">
              {mode === 'week'
                ? days.map((day, index) => (
                    <div
                      key={day}
                      className={`absolute inset-y-0 border-l border-border/40 ${index === 0 ? 'border-l-0' : ''}`}
                      style={{ left: `${(index / days.length) * 100}%` }}
                    />
                  ))
                : hours.map((hour) => (
                    <div
                      key={hour}
                      className="absolute inset-y-0 border-l border-border/30"
                      style={{ left: `${pct(hour * 60)}%` }}
                    />
                  ))}

              {mode === 'week'
                ? days.map((day, index) => {
                    const dayEntries = lane.byDay.get(day) ?? [];
                    if (dayEntries.length === 0) return null;
                    const seconds = totalSeconds(dayEntries);
                    const width = Math.min(100, Math.max(12, (seconds / DAY_REFERENCE_SECONDS) * 100));
                    return (
                      <button
                        key={day}
                        onClick={() => onEdit?.(sortByStart(dayEntries)[0])}
                        title={`${formatDayShort(day)} · ${formatDurationShort(seconds)}`}
                        className="absolute inset-y-1.5 -translate-x-1/2 rounded-md px-1 text-[10px] font-medium text-white"
                        style={{
                          left: `${((index + 0.5) / days.length) * 100}%`,
                          width: `${width}%`,
                          maxWidth: `${100 / days.length}%`,
                        }}
                      >
                        <span className={`flex h-full items-center justify-center rounded-md ${color.bar} px-1`}>
                          {formatDurationShort(seconds)}
                        </span>
                      </button>
                    );
                  })
                : sortByStart(lane.byDay.get(days[0]) ?? []).map((entry) => {
                    const isLive = entry.id === timerEntryId;
                    const isActive = entry.id === activeEntryId;
                    const start = parseHHMM(entry.startTime);
                    const end = parseHHMM(entry.endTime);
                    return (
                      <button
                        key={entry.id}
                        data-plan-active={isActive ? 'true' : undefined}
                        onClick={() => !isLive && onEdit?.(entry)}
                        title={`${entry.startTime}–${entry.endTime} · ${entry.taskName}\n${entry.description ?? ''}`}
                        className={`absolute inset-y-1.5 overflow-hidden rounded-md px-2 text-left text-[10px] font-medium text-white transition hover:brightness-110 ${color.bar} ${
                          isLive ? 'border-2 border-dashed border-red-300 ring-2 ring-red-500/50' : ''
                        } ${isActive ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}`}
                        style={{ left: `${pct(start)}%`, width: `${Math.max(1.5, pct(end) - pct(start))}%` }}
                      >
                        <span className="block truncate">
                          {entry.startTime}–{entry.endTime}
                        </span>
                        {entry.description && <span className="block truncate opacity-80">{entry.description}</span>}
                      </button>
                    );
                  })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
