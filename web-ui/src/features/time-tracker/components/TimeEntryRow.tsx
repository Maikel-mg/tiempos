import { CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import type { TimeEntry } from '../types';

interface TimeEntryRowProps {
  entry: TimeEntry;
  selected: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

/**
 * Formatea duración en segundos a formato legible.
 */
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}

/**
 * Formatea fecha YYYY-MM-DD a DD/MM/YYYY.
 */
function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Fila individual del listado de registros de tiempo.
 */
export function TimeEntryRow({ entry, selected, onToggle, onDelete }: TimeEntryRowProps) {
  return (
    <TableRow className={selected ? 'bg-green-50' : ''}>
      {/* Checkbox */}
      <TableCell className="w-12">
        <button
          onClick={onToggle}
          className="flex items-center justify-center"
        >
          {selected ? (
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground hover:text-foreground" />
          )}
        </button>
      </TableCell>

      {/* Date */}
      <TableCell className="whitespace-nowrap">
        {formatDate(entry.date)}
      </TableCell>

      {/* Task */}
      <TableCell className="font-medium">
        {entry.taskName}
      </TableCell>

      {/* Start Time */}
      <TableCell className="font-mono text-muted-foreground">
        {entry.startTime}
      </TableCell>

      {/* End Time */}
      <TableCell className="font-mono text-muted-foreground">
        {entry.endTime}
      </TableCell>

      {/* Duration */}
      <TableCell className="whitespace-nowrap">
        {formatDuration(entry.duration)}
      </TableCell>

      {/* Synced Status */}
      <TableCell>
        {entry.synced ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            Sincronizado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            <Circle className="w-3 h-3" />
            Pendiente
          </span>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell className="w-20">
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}