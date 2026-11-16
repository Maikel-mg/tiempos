import { useState } from 'react';
import { Check, Info, Plus, SplitSquareHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDurationShort } from '@/lib/format';
import type { TimeEntry } from '@/features/time-tracker/types';
import type { MarcajeDia } from '../hooks/useMarcajesPeriodo';
import { DAY_CUADRE_LABEL, type DayCuadre, type MarcajeFix } from '../lib/cuadre';
import { formatMarcajesDelta } from '../lib/marcajes';
import { formatDayLong, todayKey, totalSeconds } from '../lib/planRange';

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
  /** Añade un Marcaje manual al día. */
  onAddManual: (day: string, time: string) => Promise<void>;
  /** Corrige la hora de un Marcaje manual. */
  onUpdateManual: (day: string, fromTime: string, toTime: string) => Promise<void>;
  /** Borra un Marcaje manual. */
  onRemoveManual: (day: string, time: string) => Promise<void>;
}

/**
 * Un día del popup de marcajes: lo fichado frente a lo registrado, y cada
 * Registro que no cabe en su Franja fichada con el botón que propone el horario
 * exacto. Nada se aplica solo: cada corrección es una pulsación.
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
}: MarcajesDayCardProps) {
  const [error, setError] = useState<string | null>(null);
  const [nuevaHora, setNuevaHora] = useState('');
  // Solo se completa a mano lo que ya pasó: el fichaje de hoy aún está por llegar.
  const puedeAnadir = day < todayKey();
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
        {(info?.marcajes ?? []).map((marcaje) =>
          marcaje.manual ? (
            <span
              key={`${marcaje.time}-manual`}
              className="inline-flex items-center gap-1 rounded border border-dashed border-primary/50 bg-primary/5 px-1.5 py-0.5"
              title="Marcaje añadido a mano"
            >
              <input
                type="time"
                value={marcaje.time}
                aria-label={`Hora del marcaje manual de las ${marcaje.time}`}
                onChange={(event) => {
                  if (event.target.value) void onUpdateManual(day, marcaje.time, event.target.value);
                }}
                className="w-[70px] bg-transparent font-mono text-xs text-primary"
              />
              <span className="text-[9px] font-semibold uppercase tracking-wide text-primary">manual</span>
              <button
                type="button"
                aria-label={`Borrar marcaje manual de las ${marcaje.time}`}
                title="Borrar marcaje manual"
                onClick={() => void onRemoveManual(day, marcaje.time)}
                className="rounded p-0.5 text-primary/70 transition hover:bg-primary/10 hover:text-primary"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ) : (
            <span
              key={`${marcaje.time}-${marcaje.origen}`}
              title="Marcaje de la intranet"
              className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
            >
              {marcaje.time}
            </span>
          ),
        )}
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

      {puedeAnadir && (
        <form
          className="flex items-center gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!nuevaHora) return;
            void onAddManual(day, nuevaHora);
            setNuevaHora('');
          }}
        >
          <Input
            type="time"
            value={nuevaHora}
            onChange={(event) => setNuevaHora(event.target.value)}
            aria-label={`Nueva hora fichada el ${day}`}
            className="h-7 w-[104px] py-0 text-xs"
          />
          <Button type="submit" variant="outline" size="sm" className="h-7 text-xs" disabled={!nuevaHora}>
            <Plus className="mr-1 h-3 w-3" />
            Añadir marcaje
          </Button>
        </form>
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
