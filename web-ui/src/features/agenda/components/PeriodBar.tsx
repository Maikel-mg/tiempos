import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDurationShort, formatHHMM } from '@/lib/format';
import { formatDayLong, formatWeekLabel, todayKey, totalSeconds, type PlanMode } from '../lib/planRange';
import { estimateExit } from '../lib/estimatedExit';
import { getDailyTarget } from '@/features/time-tracker/lib/schedule';
import type { TimeEntry } from '@/features/time-tracker/types';

interface PeriodBarProps {
  mode: PlanMode;
  cursor: string;
  entries: TimeEntry[];
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onModeChange: (mode: PlanMode) => void;
  onJump: (day: string) => void;
  /** Controles extra a la derecha (sincronizar día, por ejemplo). */
  children?: React.ReactNode;
}

/** Reloj del bar: refresca el reloj para que la salida estimada no se congele. */
function useNowMinute(enabled: boolean): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, [enabled]);
  return now;
}

/** Título del período, su total y el paginador día/semana. */
export function PeriodBar({
  mode,
  cursor,
  entries,
  onPrev,
  onNext,
  onToday,
  onModeChange,
  onJump,
  children,
}: PeriodBarProps) {
  // Sólo el día de hoy tiene salida estimada: en días pasados el dato sobra y
  // en la semana no hay una sola hora de salida que enseñar.
  const isToday = mode === 'day' && cursor === todayKey();
  const now = useNowMinute(isToday);
  const exit = isToday
    ? estimateExit(
        getDailyTarget(cursor) * 3600,
        entries.filter((entry) => !entry.recoverable).reduce((sum, entry) => sum + entry.duration, 0),
        now,
      )
    : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onPrev} aria-label="Período anterior">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-[200px]">
          <h2 className="text-lg font-semibold capitalize leading-tight">
            {mode === 'week' ? formatWeekLabel(cursor) : formatDayLong(cursor)}
          </h2>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="whitespace-nowrap">
              {entries.length} {entries.length === 1 ? 'registro' : 'registros'} ·{' '}
              {formatDurationShort(totalSeconds(entries))}
            </span>
            {exit && (
              <span
                title={`Objetivo ${formatDurationShort(getDailyTarget(cursor) * 3600)} · faltan ${formatDurationShort(
                  exit.remainingMinutes * 60,
                )}`}
                className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary"
              >
                <Clock className="h-3 w-3" />
                <span className="font-medium">salida ~{formatHHMM(exit.exitMinutes)}</span>
                <span className="opacity-70">· faltan {formatDurationShort(exit.remainingMinutes * 60)}</span>
              </span>
            )}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onNext} aria-label="Período siguiente">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {children}
        <Button variant="outline" size="sm" onClick={onToday} title="Hoy (T)">
          Hoy
        </Button>
        <label htmlFor="agenda-jump" className="text-xs text-muted-foreground" title="Ir a una fecha (F)">
          Ir a
        </label>
        <Input
          id="agenda-jump"
          type="date"
          aria-label="Ir a fecha"
          title="Ir a una fecha (F)"
          value={cursor}
          onChange={(event) => {
            if (event.target.value) onJump(event.target.value);
          }}
          className="h-8 w-36 text-xs"
        />
        <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
          {(['day', 'week'] as PlanMode[]).map((value) => (
            <button
              key={value}
              onClick={() => onModeChange(value)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                mode === value ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {value === 'day' ? 'Día' : 'Semana'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
