import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { MarcajeDia } from '../hooks/useMarcajesPeriodo';
import { todayKey } from '../lib/planRange';

interface MarcajesDayMarcajesProps {
  day: string;
  info?: MarcajeDia;
  onAddManual: (day: string, time: string) => void;
  onUpdateManual: (day: string, fromTime: string, toTime: string) => void;
  onRemoveManual: (day: string, time: string) => void;
}

/**
 * Los Marcajes del día: los de la intranet, en solo lectura, y los manuales, que
 * se distinguen y se pueden corregir y borrar. Solo se completa a mano lo que ya
 * pasó: el fichaje de hoy aún está por llegar.
 */
export function MarcajesDayMarcajes({
  day,
  info,
  onAddManual,
  onUpdateManual,
  onRemoveManual,
}: MarcajesDayMarcajesProps) {
  const puedeAnadir = day < todayKey();
  const [nuevaHora, setNuevaHora] = useState('');

  return (
    <>
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
                  if (event.target.value) onUpdateManual(day, marcaje.time, event.target.value);
                }}
                className="w-[70px] bg-transparent font-mono text-xs text-primary"
              />
              <span className="text-[9px] font-semibold uppercase tracking-wide text-primary">manual</span>
              <button
                type="button"
                aria-label={`Borrar marcaje manual de las ${marcaje.time}`}
                title="Borrar marcaje manual"
                onClick={() => onRemoveManual(day, marcaje.time)}
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
      </div>

      {puedeAnadir && (
        <form
          className="flex items-center gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!nuevaHora) return;
            onAddManual(day, nuevaHora);
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
    </>
  );
}
