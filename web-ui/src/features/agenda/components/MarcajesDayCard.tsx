import { useState } from 'react';
import { Check, Info, SplitSquareHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDurationShort } from '@/lib/format';
import type { TimeEntry } from '@/features/time-tracker/types';
import type { MarcajeDia } from '../hooks/useMarcajesPeriodo';
import { DAY_CUADRE_LABEL, type DayCuadre, type MarcajeFix } from '../lib/cuadre';
import { formatMarcajesDelta } from '../lib/marcajes';
import { formatDayLong, totalSeconds } from '../lib/planRange';

interface MarcajesDayCardProps {
  day: string;
  /** Marcajes del día, con la frescura de la lectura. */
  info?: MarcajeDia;
  /** Estado del cuadre del día. */
  cuadre?: DayCuadre;
  /** Registros de tiempo del día. */
  entries: TimeEntry[];
  /** Aplica una corrección; devuelve el motivo si no se pudo. */
  onApplyFix: (fix: MarcajeFix) => Promise<string | null>;
  /** Abre Dividir sobre un Registro que cruza dos franjas. */
  onSplit?: (entry: TimeEntry) => void;
}

/**
 * Un día del popup de marcajes: lo fichado frente a lo registrado, y cada
 * Registro que no cabe en su Franja fichada con el botón que propone el horario
 * exacto. Nada se aplica solo: cada corrección es una pulsación.
 */
export function MarcajesDayCard({ day, info, cuadre, entries, onApplyFix, onSplit }: MarcajesDayCardProps) {
  const [error, setError] = useState<string | null>(null);
  const registered = totalSeconds(entries);
  const delta = (info?.coveredMinutes ?? 0) * 60 - registered;

  const apply = async (fix: MarcajeFix) => {
    setError(await onApplyFix(fix));
  };

  return (
    <section className="space-y-2 rounded-lg border p-3">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold capitalize">{formatDayLong(day)}</h3>
        <span className="font-mono text-xs text-muted-foreground">
          {formatDurationShort((info?.coveredMinutes ?? 0) * 60)} marcadas · {formatDurationShort(registered)}{' '}
          registradas
        </span>
      </header>

      <div className="flex flex-wrap items-center gap-1.5">
        {(info?.times ?? []).map((time, index) => (
          <span key={`${time}-${index}`} className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
            {time}
          </span>
        ))}
        {info?.stale && (
          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
            dato viejo
          </span>
        )}
        {cuadre && (
          <span className="text-[10px] font-medium text-muted-foreground">{DAY_CUADRE_LABEL[cuadre.status]}</span>
        )}
        <span
          className={`ml-auto font-mono text-xs font-medium ${delta === 0 ? 'text-muted-foreground' : 'text-primary'}`}
          title="Marcadas − registradas"
        >
          {formatMarcajesDelta(delta)}
        </span>
      </div>

      {cuadre && cuadre.franjas.length > 0 && (
        <p className="font-mono text-[11px] text-muted-foreground">
          fichado {cuadre.franjas.map((franja) => `${franja.start}–${franja.end}`).join(' · ')}
        </p>
      )}

      {cuadre && cuadre.status === 'descuadrado' && (
        <ul className="divide-y rounded-md border border-dashed">
          {cuadre.desajustes.map((desajuste) => {
            const entry = entries.find((candidate) => candidate.id === desajuste.entryId);
            if (!entry) return null;
            const cruza = desajuste.kind === 'cruza-franja';
            return (
              <li key={desajuste.entryId} className="space-y-1 px-2 py-1.5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
                  <span className="font-medium">{entry.taskName}</span>
                  <span className="font-mono text-muted-foreground">
                    {entry.startTime}–{entry.endTime}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {cruza
                      ? `cruza dos franjas: ${formatDurationShort(desajuste.minutosFichados * 60)} fichados · ${formatDurationShort(desajuste.minutosNoFichados * 60)} sin fichar`
                      : `${desajuste.kind.startsWith('ampliar') ? 'no cubre' : 'se sale de'} su franja`}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {desajuste.fixes.map((fix) => (
                    <Button
                      key={fix.kind + fix.label}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => void apply(fix)}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      {fix.label}
                    </Button>
                  ))}
                  {cruza && onSplit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => onSplit(entry)}
                      title="Repartir el Registro entre las dos franjas"
                    >
                      <SplitSquareHorizontal className="mr-1 h-3 w-3" />
                      Dividir
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p className="flex items-start gap-1 text-xs text-destructive">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </section>
  );
}
