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
import type { TimeEntry } from '@/features/time-tracker/types';
import type { MarcajesPeriodo } from '../hooks/useMarcajesPeriodo';
import type { DayCuadre, MarcajeFix } from '../lib/cuadre';
import { MarcajesDayCard } from './MarcajesDayCard';

interface MarcajesButtonProps {
  /** Días del período visible. */
  days: string[];
  /** Registros de tiempo del período, para comparar con lo marcado. */
  entries: TimeEntry[];
  /** Marcajes del período, leídos de la caché y refrescados en segundo plano. */
  marcajes: MarcajesPeriodo;
  /** Estado del cuadre de cada día del período. */
  cuadresPorDia: Map<string, DayCuadre>;
  /** Aplica una corrección; devuelve el motivo si no se pudo. */
  onApplyFix: (fix: MarcajeFix) => Promise<string | null>;
  /** Abre Dividir sobre el Registro que cruza dos franjas. */
  onSplit: (entry: TimeEntry) => void;
}

/**
 * Popup con los marcajes de la intranet del período: día a día, lo fichado
 * frente a lo registrado y los Registros que no caben en su franja. Lo leído
 * vive en la caché local, así que el popup enseña lo último que se sabe aunque
 * no haya VPN.
 */
export function MarcajesButton({ days, entries, marcajes, cuadresPorDia, onApplyFix, onSplit }: MarcajesButtonProps) {
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
            {days.map((day) => (
              <MarcajesDayCard
                key={day}
                day={day}
                info={marcajes.byDay.get(day)}
                cuadre={cuadresPorDia.get(day)}
                entries={entries.filter((entry) => entry.date === day)}
                onApplyFix={onApplyFix}
                onSplit={onSplit}
                onAddManual={marcajes.addManual}
                onUpdateManual={marcajes.updateManual}
                onRemoveManual={marcajes.removeManual}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
