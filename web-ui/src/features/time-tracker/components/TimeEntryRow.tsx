import { CheckCircle2, Circle, XCircle, Trash2, Pencil, Play, Copy, Database } from 'lucide-react';
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
  onDuplicate?: () => void;
  onSync?: () => void;
  /** Información de recuperación para entries recuperables (permisos). */
  recoveryInfo?: { recovered: number; total: number };
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
 * Formatea segundos a H:MM (sin cero inicial en horas).
 */
function formatRecoveryTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
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
export function TimeEntryRow({ entry, selected, onToggle, onDelete, onEdit, onPlay, onDuplicate, onSync, recoveryInfo }: TimeEntryRowProps) {
  const SYNCED_TOOLTIP = 'Ya sincronizado con la BD — no se puede editar desde aquí';

  return (
    <TooltipProvider>
      <TableRow className={[
        selected ? 'bg-green-50' : '',
        entry.recoverable && !selected ? 'bg-amber-50 dark:bg-amber-950/20' : '',
      ].filter(Boolean).join(' ')}>
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
        <div className="flex items-center gap-2">
          {entry.taskName}
          {entry.recoverable && (
            <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded">
              Permiso
            </span>
          )}
        </div>
        {entry.recoverable && recoveryInfo && (
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 w-24 rounded-full bg-amber-200 dark:bg-amber-800/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 dark:bg-amber-400"
                style={{ width: `${recoveryInfo.total > 0 ? Math.min((recoveryInfo.recovered / recoveryInfo.total) * 100, 100) : 0}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {formatRecoveryTime(recoveryInfo.recovered)} / {formatRecoveryTime(recoveryInfo.total)}
            </span>
          </div>
        )}
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
            {onDuplicate && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDuplicate}
                className="min-w-[44px] min-h-[44px] text-muted-foreground hover:text-foreground"
                title="Duplicar entrada"
              >
                <Copy className="w-4 h-4" />
              </Button>
            )}
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
            {onSync && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onSync}
                className="min-w-[44px] min-h-[44px] text-blue-600 hover:text-blue-700"
                title="Sincronizar registro"
              >
                <Database className="w-4 h-4" />
              </Button>
            )}
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
            {onDuplicate && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDuplicate}
                className="min-w-[44px] min-h-[44px] text-muted-foreground hover:text-foreground"
                title="Duplicar entrada"
              >
                <Copy className="w-4 h-4" />
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