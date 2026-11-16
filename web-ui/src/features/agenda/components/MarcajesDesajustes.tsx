import { Check, SplitSquareHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDurationShort } from '@/lib/format';
import type { TimeEntry } from '@/features/time-tracker/types';
import type { DayCuadre, MarcajeFix } from '../lib/cuadre';

interface MarcajesDesajustesProps {
  cuadre?: DayCuadre;
  entries: TimeEntry[];
  onApplyFix: (fix: MarcajeFix) => void;
  onSplit?: (entry: TimeEntry) => void;
}

/**
 * Los Registros del día que no caben en su Franja fichada, cada uno con el botón
 * que propone el horario exacto. Los cruces de franja se distinguen y, además
 * del recorte, ofrecen Dividir: la app nunca parte un Registro por su cuenta.
 */
export function MarcajesDesajustes({ cuadre, entries, onApplyFix, onSplit }: MarcajesDesajustesProps) {
  if (!cuadre || cuadre.status !== 'descuadrado') return null;

  return (
    <ul className="divide-y rounded-md border border-dashed">
      {cuadre.desajustes.map((desajuste) => {
        const entry = entries.find((candidate) => candidate.id === desajuste.entryId);
        if (!entry) return null;
        const cruza = desajuste.kind === 'cruza-franja';
        return (
          <li
            key={desajuste.entryId}
            className={`space-y-1 px-2 py-1.5 ${cruza ? 'border-l-2 border-amber-500/70 bg-amber-500/5' : ''}`}
          >
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
              <span className="font-medium">{entry.taskName}</span>
              <span className="font-mono text-muted-foreground">
                {entry.startTime}–{entry.endTime}
              </span>
              {cruza ? (
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  cruza dos franjas
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">
                  {desajuste.kind.startsWith('ampliar') ? 'no cubre' : 'se sale de'} su franja
                </span>
              )}
            </div>

            {cruza && (
              <p className="text-[11px] text-muted-foreground">
                {formatDurationShort(desajuste.minutosFichados * 60)} fichados ·{' '}
                {formatDurationShort(desajuste.minutosNoFichados * 60)} sin fichar
              </p>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
              {desajuste.fixes.map((fix) => (
                <Button
                  key={fix.kind + fix.label}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onApplyFix(fix)}
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
  );
}
