import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDurationShort } from '@/lib/format';
import { formatDayLong, formatWeekLabel, totalSeconds, type PlanMode } from '../lib/planRange';
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
          <p className="text-xs text-muted-foreground">
            {entries.length} {entries.length === 1 ? 'registro' : 'registros'} ·{' '}
            {formatDurationShort(totalSeconds(entries))}
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
