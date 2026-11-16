import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { TimeEntry } from '@/features/time-tracker/types';
import { fixPreview, fixesAjustables, type DayCuadre, type MarcajeFix } from '../lib/cuadre';

interface MarcajesAjusteDiaProps {
  cuadre?: DayCuadre;
  entries: TimeEntry[];
  onApplyAll: (fixes: MarcajeFix[]) => Promise<{ applied: number; blocked?: string }>;
}

/** Resultado del lote, para contarlo tal cual al usuario. */
interface LoteResultado {
  applied: number;
  blocked?: string;
}

/**
 * `Ajustar el día`: previsualiza qué Registro cambia y con qué horario queda
 * antes de aplicar nada. Al confirmar, aplica en orden de hora y se para en el
 * primer solape, diciendo cuál quedó sin aplicar. Los cruces de franja no entran.
 */
export function MarcajesAjusteDia({ cuadre, entries, onApplyAll }: MarcajesAjusteDiaProps) {
  const [previsualizando, setPrevisualizando] = useState(false);
  const [lote, setLote] = useState<LoteResultado | null>(null);

  const ajustables = cuadre && cuadre.status === 'descuadrado' ? fixesAjustables(cuadre.desajustes) : [];
  if (ajustables.length === 0) return null;

  return (
    <div className="space-y-1.5 rounded-md bg-muted/40 p-2">
      {!previsualizando ? (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => {
            setLote(null);
            setPrevisualizando(true);
          }}
        >
          Ajustar el día
        </Button>
      ) : (
        <>
          <p className="text-[11px] font-medium">Antes de aplicar, esto es lo que cambia:</p>
          <ul className="space-y-0.5">
            {ajustables.map((fix) => {
              const entry = entries.find((candidate) => candidate.id === fix.entryId);
              if (!entry) return null;
              const preview = fixPreview(entry, fix);
              return (
                <li key={fix.entryId + fix.label} className="font-mono text-[11px] text-muted-foreground">
                  {preview.taskName}: {entry.startTime}–{entry.endTime} → {preview.range}
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                void onApplyAll(ajustables).then((resultado) => {
                  setPrevisualizando(false);
                  setLote(resultado);
                });
              }}
            >
              Aplicar {ajustables.length} ajustes
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setPrevisualizando(false)}>
              Cancelar
            </Button>
          </div>
        </>
      )}

      {lote && (
        <p className="text-[11px] text-muted-foreground">
          {lote.applied === 0
            ? 'No se aplicó ningún ajuste.'
            : `Se ${lote.applied === 1 ? 'aplicó 1 ajuste' : `aplicaron ${lote.applied} ajustes`}.`}
          {lote.blocked && ` Se detuvo en ${lote.blocked}`}
        </p>
      )}
    </div>
  );
}
