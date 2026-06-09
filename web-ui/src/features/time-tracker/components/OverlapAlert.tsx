import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { TimeEntry } from '../types';

interface OverlapAlertProps {
  entries: TimeEntry[];
}

/**
 * Encuentra registros que se solapan en el mismo día.
 */
function findOverlaps(entries: TimeEntry[]): Array<[TimeEntry, TimeEntry]> {
  const overlaps: Array<[TimeEntry, TimeEntry]> = [];
  const byDate = new Map<string, TimeEntry[]>();

  // Group by date
  entries.forEach(e => {
    const list = byDate.get(e.date) || [];
    list.push(e);
    byDate.set(e.date, list);
  });

  // Check overlaps per day
  byDate.forEach((dayEntries) => {
    for (let i = 0; i < dayEntries.length; i++) {
      for (let j = i + 1; j < dayEntries.length; j++) {
        const a = dayEntries[i];
        const b = dayEntries[j];
        
        // Convert HH:MM to minutes
        const toMin = (t: string) => {
          const [h, m] = t.split(':').map(Number);
          return h * 60 + m;
        };
        
        const aStart = toMin(a.startTime);
        const aEnd = toMin(a.endTime);
        const bStart = toMin(b.startTime);
        const bEnd = toMin(b.endTime);

        // Check if overlaps (not just touching)
        if (aStart < bEnd && bStart < aEnd) {
          overlaps.push([a, b]);
        }
      }
    }
  });

  return overlaps;
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
 */
export function OverlapAlert({ entries }: OverlapAlertProps) {
  const overlaps = findOverlaps(entries);
  
  if (overlaps.length === 0) return null;

  return (
    <Alert variant="default" className="border-yellow-500 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-950/30">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Registros solapados detectados</AlertTitle>
      <AlertDescription>
        <ul className="list-disc pl-4 mt-2 space-y-1 text-sm">
          {overlaps.map(([a, b], idx) => (
            <li key={idx}>
              <strong>{formatDate(a.date)}</strong>: {a.taskName} ({a.startTime}-{a.endTime}) 
              {' '}con{' '}
              {b.taskName} ({b.startTime}-{b.endTime})
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}