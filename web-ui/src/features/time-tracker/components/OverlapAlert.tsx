import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { buildOverlapFixes, findOverlaps, type OverlapFix } from '../lib/overlaps';
import type { TimeEntry } from '../types';

interface OverlapAlertProps {
  entries: TimeEntry[];
  /**
   * Aplica una corrección sugerida. Sin este callback la alerta es de sólo
   * lectura y no muestra botones.
   */
  onApplyFix?: (fix: OverlapFix) => void;
}

/**
 * Formatea fecha YYYY-MM-DD a DD/MM/YYYY.
 */
function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Alerta visual que se muestra siempre cuando hay registros solapados.
 * Cumple con el requisito del PRD: alertas siempre visibles.
 *
 * Cuando recibe `onApplyFix`, cada solapamiento ofrece las correcciones
 * rápidas que dejan los dos registros con duración positiva.
 */
export function OverlapAlert({ entries, onApplyFix }: OverlapAlertProps) {
  const overlaps = findOverlaps(entries);

  if (overlaps.length === 0) return null;

  return (
    <Alert variant="default" className="border-yellow-500 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-950/30">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Registros solapados detectados</AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-4 mt-2 space-y-2 text-sm">
          {overlaps.map((pair, idx) => (
            <li key={idx}>
              <strong>{formatDate(pair.earlier.date)}</strong>: {pair.earlier.taskName} ({pair.earlier.startTime}-{pair.earlier.endTime})
              {' '}con{' '}
              {pair.later.taskName} ({pair.later.startTime}-{pair.later.endTime})
              {onApplyFix && (
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {buildOverlapFixes(pair).map((fix) => (
                    <Button
                      key={fix.kind}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => onApplyFix(fix)}
                    >
                      {fix.label}
                    </Button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
