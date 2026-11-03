import { useMemo, useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDurationShort } from '@/lib/format';
import type { TimeEntry } from '@/features/time-tracker/types';
import { useMarcajes } from '../hooks/useMarcajes';
import { formatMarcajesDelta, groupMarcajesByDay } from '../lib/marcajes';
import { formatDayLong, totalSeconds } from '../lib/planRange';

interface MarcajesButtonProps {
  /** Días del período visible. */
  days: string[];
  /** Registros de tiempo del período, para comparar con lo marcado. */
  entries: TimeEntry[];
}

/**
 * Popup con los marcajes de la intranet del período: horas fichadas, total
 * cubierto y diferencia con lo registrado. Se pide solo al abrirlo.
 */
export function MarcajesButton({ days, entries }: MarcajesButtonProps) {
  const [open, setOpen] = useState(false);
  const { data, isFetching, error } = useMarcajes({ days, enabled: open });
  const byDay = useMemo(() => groupMarcajesByDay(data ?? []), [data]);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        title="Marcajes de la intranet para cuadrar las horas"
      >
        <Fingerprint className="mr-1 h-3.5 w-3.5" />
        Ver marcajes
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Marcajes de la intranet</DialogTitle>
            <DialogDescription>
              Horas fichadas frente a las registradas en este período. Los marcajes suelen estar disponibles a día
              pasado.
            </DialogDescription>
          </DialogHeader>

          {isFetching && <p className="text-sm text-muted-foreground">Leyendo marcajes…</p>}
          {error && <p className="text-sm text-destructive">{error.message}</p>}
          {!isFetching && !error && byDay.length === 0 && (
            <p className="text-sm text-muted-foreground">La intranet no devuelve marcajes de este período.</p>
          )}

          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {byDay.map((day) => {
              const registered = totalSeconds(entries.filter((entry) => entry.date === day.day));
              const delta = day.coveredMinutes * 60 - registered;
              return (
                <section key={day.day} className="space-y-1.5 rounded-lg border p-3">
                  <header className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold capitalize">{formatDayLong(day.day)}</h3>
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatDurationShort(day.coveredMinutes * 60)} marcadas · {formatDurationShort(registered)}{' '}
                      registradas
                    </span>
                  </header>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {day.times.map((time, index) => (
                      <span key={`${time}-${index}`} className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                        {time}
                      </span>
                    ))}
                    <span
                      className={`ml-auto font-mono text-xs font-medium ${
                        delta === 0 ? 'text-muted-foreground' : 'text-primary'
                      }`}
                      title="Marcadas − registradas"
                    >
                      {formatMarcajesDelta(delta)}
                    </span>
                  </div>
                </section>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
