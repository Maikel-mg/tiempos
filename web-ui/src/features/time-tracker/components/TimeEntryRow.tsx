import { CheckCircle2, Circle, XCircle, Trash2, Pencil, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import type { TimeEntry } from '../types';

interface TimeEntryRowProps {
  entry: TimeEntry;
  selected: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onEdit?: () => void;
  onPlay?: () => void;
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
export function TimeEntryRow({ entry, selected, onToggle, onDelete, onEdit, onPlay }: TimeEntryRowProps) {
  const SYNCED_TOOLTIP = 'Ya sincronizado con la BD — no se puede editar desde aquí';

  return (
    <TooltipProvider>
      <TableRow className={selected ? 'bg-green-50' : ''}>
      {/* Checkbox */}
      <TableCell className="w-12">
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-md hover:bg-accent"
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

      {/* Description */}
      <TableCell className="text-muted-foreground text-sm truncate max-w-[200px]" title={entry.description}>
        {entry.description || '—'}
      </TableCell>

      {/* Start Time */}
      <TableCell className="font-mono tabular-nums text-muted-foreground">
        {entry.startTime}
      </TableCell>

      {/* End Time */}
      <TableCell className="font-mono tabular-nums text-muted-foreground">
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
        ) : entry.syncError ? (
          <span
            className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full"
            title={entry.syncError}
          >
            <XCircle className="w-3 h-3" />
            Fallido
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            <Circle className="w-3 h-3" />
            Pendiente
          </span>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell className="w-24">
        {entry.synced ? (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={onPlay} className="min-w-[44px] min-h-[44px] text-green-600 hover:text-green-700">
              <Play className="w-4 h-4" />
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button variant="ghost" size="icon" disabled className="min-w-[44px] min-h-[44px] text-muted-foreground">
                    <Pencil className="w-4 h-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{SYNCED_TOOLTIP}</TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={onPlay} className="min-w-[44px] min-h-[44px] text-green-600 hover:text-green-700">
              <Play className="w-4 h-4" />
            </Button>
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                className="min-w-[44px] min-h-[44px] text-muted-foreground hover:text-foreground"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="min-w-[44px] min-h-[44px] text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
    </TooltipProvider>
  );
}