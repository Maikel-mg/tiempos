import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cutTimeFromMinutes } from '../lib/splitEntry';

/**
 * Vista previa del corte y atajos del diálogo de "Dividir".
 *
 * Presentacional: recibe la geometría y los minutos de cada mitad ya resueltos;
 * sólo avisa de qué atajo se ha pulsado.
 */

const QUICK_CUTS = [
  { label: 'Un cuarto', ratio: 0.25 },
  { label: 'La mitad', ratio: 0.5 },
  { label: 'Tres cuartos', ratio: 0.75 },
];

const NUDGES = [-15, -5, 5, 15];

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
}
export { formatMinutes };

export interface SplitPreviewProps {
  startTime: string;
  endTime: string;
  cutMinutes: number;
  /** Minutos de cada mitad según el plan, o `null` si el corte aún no es válido. */
  firstMinutes: number | null;
  secondMinutes: number | null;
  live: boolean;
  /** Descripción editable de cada mitad. */
  firstDescription: string;
  secondDescription: string;
  onFirstDescriptionChange: (value: string) => void;
  onSecondDescriptionChange: (value: string) => void;
  onQuickCut: (ratio: number) => void;
  onNudge: (delta: number) => void;
}

export function SplitPreview({
  startTime,
  endTime,
  cutMinutes,
  firstMinutes,
  secondMinutes,
  live,
  firstDescription,
  secondDescription,
  onFirstDescriptionChange,
  onSecondDescriptionChange,
  onQuickCut,
  onNudge,
}: SplitPreviewProps) {
  const cut = cutTimeFromMinutes(cutMinutes);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900 dark:bg-blue-950/30">
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
            {live ? 'Primera mitad (se guarda ahora)' : 'Mitad 1'}
          </div>
          <div className="mt-1 font-mono text-sm tabular-nums">
            {startTime} – {cut}
          </div>
          <div className="text-sm text-muted-foreground">
            {firstMinutes === null ? '—' : formatMinutes(firstMinutes)}
          </div>
          <Input
            value={firstDescription}
            onChange={(event) => onFirstDescriptionChange(event.target.value)}
            aria-label="Descripción de la primera mitad"
            placeholder="Descripción de la primera mitad"
            className="mt-2 h-8 text-sm"
          />
        </div>
        <div className="rounded-lg border bg-muted/40 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {live ? 'Segunda mitad (sigue corriendo)' : 'Mitad 2'}
          </div>
          <div className="mt-1 font-mono text-sm tabular-nums">
            {cut} – {endTime}
          </div>
          <div className="text-sm text-muted-foreground">
            {secondMinutes === null ? '—' : formatMinutes(secondMinutes)}
          </div>
          <Input
            value={secondDescription}
            onChange={(event) => onSecondDescriptionChange(event.target.value)}
            aria-label="Descripción de la segunda mitad"
            placeholder="Descripción de la segunda mitad"
            className="mt-2 h-8 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Atajos:</span>
          {QUICK_CUTS.map((preset) => (
            <Button
              key={preset.label}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onQuickCut(preset.ratio)}
            >
              {preset.label}
            </Button>
          ))}
          <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          {NUDGES.map((delta) => (
            <Button
              key={delta}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onNudge(delta)}
            >
              {delta > 0 ? `+${delta}` : delta}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Arrastra el tirador · ← → 1 min · Shift 5 min · M la mitad · E escribir la hora
        </p>
      </div>
    </>
  );
}
