import { useState } from 'react';
import { Info } from 'lucide-react';
import { formatDurationShort } from '@/lib/format';
import type { TimeEntry } from '@/features/time-tracker/types';
import type { MarcajeDia } from '../hooks/useMarcajesPeriodo';
import { DAY_CUADRE_LABEL, type DayCuadre, type MarcajeFix } from '../lib/cuadre';
import { formatMarcajesDelta } from '../lib/marcajes';
import { formatDayLong, todayKey, totalSeconds } from '../lib/planRange';
import { MarcajesAjusteDia } from './MarcajesAjusteDia';
import { MarcajesDayMarcajes } from './MarcajesDayMarcajes';
import { MarcajesDesajustes } from './MarcajesDesajustes';

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
  onAddManual: (day: string, time: string) => Promise<void>;
  onUpdateManual: (day: string, fromTime: string, toTime: string) => Promise<void>;
  onRemoveManual: (day: string, time: string) => Promise<void>;
  /** Excluye el día del cuadre, o deshace la exclusión. */
  onToggleIgnored: (day: string, ignored: boolean) => Promise<void>;
  /** Aplica de una vez los ajustes simples del día, en orden de hora. */
  onApplyAll: (fixes: MarcajeFix[]) => Promise<{ applied: number; blocked?: string }>;
}

/**
 * Un día del popup de marcajes: lo fichado frente a lo registrado, cada Registro
 * que no cabe en su Franja fichada con el botón que propone el horario exacto, y
 * el alta de Marcajes manuales. Nada se aplica solo: cada corrección es una
 * pulsación, con su previsualización cuando va en lote.
 */
export function MarcajesDayCard({
  day,
  info,
  cuadre,
  entries,
  onApplyFix,
  onSplit,
  onAddManual,
  onUpdateManual,
  onRemoveManual,
  onToggleIgnored,
  onApplyAll,
}: MarcajesDayCardProps) {
  const [error, setError] = useState<string | null>(null);

  const registered = totalSeconds(entries);
  const delta = (info?.coveredMinutes ?? 0) * 60 - registered;

  // Un fallo de escritura no puede quedarse en un rechazo sin dueño.
  const sinRomper = (accion: () => Promise<void>) => {
    void accion().catch((fallo: Error) => setError(fallo.message));
  };
  const aplicar = (fix: MarcajeFix) => {
    void onApplyFix(fix).then(setError).catch((fallo: Error) => setError(fallo.message));
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
        {day !== todayKey() && (info?.marcajes.length ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => sinRomper(() => onToggleIgnored(day, !info?.ignored))}
            className="rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            title="Excluir este día del cuadre"
          >
            {info?.ignored ? 'Dejar de ignorar' : 'Ignorar este día'}
          </button>
        )}
      </div>

      <MarcajesDayMarcajes
        day={day}
        info={info}
        onAddManual={(dia, hora) => sinRomper(() => onAddManual(dia, hora))}
        onUpdateManual={(dia, desde, hasta) => sinRomper(() => onUpdateManual(dia, desde, hasta))}
        onRemoveManual={(dia, hora) => sinRomper(() => onRemoveManual(dia, hora))}
      />

      {cuadre && cuadre.franjas.length > 0 && (
        <p className="font-mono text-[11px] text-muted-foreground">
          fichado {cuadre.franjas.map((franja) => `${franja.start}–${franja.end}`).join(' · ')}
        </p>
      )}

      <MarcajesDesajustes cuadre={cuadre} entries={entries} onApplyFix={aplicar} onSplit={onSplit} />

      <MarcajesAjusteDia cuadre={cuadre} entries={entries} onApplyAll={onApplyAll} />

      {error && (
        <p className="flex items-start gap-1 text-xs text-destructive">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </section>
  );
}
