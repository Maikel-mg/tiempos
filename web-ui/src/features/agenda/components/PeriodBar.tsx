import { formatDurationShort } from '@/lib/format';
import { formatDayLong, formatWeekLabel, totalSeconds, type PlanMode } from '../lib/planRange';
import type { TimeEntry } from '@/features/time-tracker/types';

interface PeriodBarProps {
  mode: PlanMode;
  cursor: string;
  entries: TimeEntry[];
  /** Controles extra a la derecha (sincronizar día, por ejemplo). */
  children?: React.ReactNode;
}

/** Título del período con su total y su número de Registros de tiempo. */
export function PeriodBar({ mode, cursor, entries, children }: PeriodBarProps) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <div>
        <h2 className="text-xl font-semibold capitalize tracking-tight">
          {mode === 'week' ? formatWeekLabel(cursor) : formatDayLong(cursor)}
        </h2>
        <p className="text-xs text-muted-foreground">
          {entries.length} {entries.length === 1 ? 'registro' : 'registros'} ·{' '}
          {formatDurationShort(totalSeconds(entries))}
        </p>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
