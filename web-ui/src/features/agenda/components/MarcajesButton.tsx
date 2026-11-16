import { useState } from 'react';
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
import type { MarcajesPeriodo } from '../hooks/useMarcajesPeriodo';
import { DAY_CUADRE_LABEL, type DayCuadre } from '../lib/cuadre';
import { formatMarcajesDelta } from '../lib/marcajes';
import { formatDayLong, totalSeconds } from '../lib/planRange';

interface MarcajesButtonProps {
  /** Días del período visible. */
  days: string[];
  /** Registros de tiempo del período, para comparar con lo marcado. */
  entries: TimeEntry[];
  /** Marcajes del período, ya leídos de la caché y refrescados en segundo plano. */
  marcajes: MarcajesPeriodo;
  /** Estado del cuadre de cada día del período. */
  cuadresPorDia: Map<string, DayCuadre>;
}

/**
 * Popup con los marcajes de la intranet del período: horas fichadas, total
 * cubierto y diferencia con lo registrado, día a día. Lo leído vive en la caché
 * local, así que el popup enseña lo último que se sabe aunque no haya VPN.
 */
export function MarcajesButton({ days, entries, marcajes, cuadresPorDia }: MarcajesButtonProps) {
  const [open, setOpen] = useState(false);

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

          {marcajes.isRefreshing && <p className="text-sm text-muted-foreground">Leyendo marcajes…</p>}
          {marcajes.error && (
            <p className="text-sm text-muted-foreground">
              Sin conexión con la intranet: se muestran los marcajes guardados.
            </p>
          )}

          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {days.map((day) => {
              const info = marcajes.byDay.get(day);
              const cuadre = cuadresPorDia.get(day);
              const registered = totalSeconds(entries.filter((entry) => entry.date === day));
              const delta = (info?.coveredMinutes ?? 0) * 60 - registered;
              return (
                <section key={day} className="space-y-1.5 rounded-lg border p-3">
                  <header className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-sm font-semibold capitalize">{formatDayLong(day)}</h3>
                    <span className="font-mono text-xs text-muted-foreground">
                      {formatDurationShort((info?.coveredMinutes ?? 0) * 60)} marcadas ·{' '}
                      {formatDurationShort(registered)} registradas
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
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {DAY_CUADRE_LABEL[cuadre.status]}
                      </span>
                    )}
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
