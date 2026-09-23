import { Split } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TimerRowProps {
  taskName: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  description?: string;
  /** Divide el timer en curso. El diálogo lo abre quien nos renderiza. */
  onSplit?: () => void;
  /** Motivo por el que el timer en curso no se puede dividir a mano. */
  splitDisabledReason?: string;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Fila visual del timer activo en la lista de entries.
 * Solo lectura — sin checkbox, sin sync status.
 */
export function TimerRow({ taskName, date, startTime, endTime, duration, description, onSplit, splitDisabledReason }: TimerRowProps) {
  return (
    <TableRow className="bg-blue-50 dark:bg-blue-950/30 border-l-2 border-l-blue-500">
      {/* Checkbox placeholder — aligns with TimeEntryRow checkbox column */}
      <TableCell className="w-12" />

      {/* Date */}
      <TableCell className="whitespace-nowrap">
        {formatDate(date)}
      </TableCell>

      {/* Task + Green dot */}
      <TableCell className="font-medium">
        <span className="inline-flex items-center gap-2">
          <span data-testid="timer-dot" className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          {taskName}
        </span>
      </TableCell>

      {/* Description */}
      <TableCell className="text-muted-foreground text-sm truncate max-w-[200px]" title={description}>
        {description || '—'}
      </TableCell>

      {/* Start Time */}
      <TableCell className="font-mono tabular-nums text-muted-foreground">
        {startTime}
      </TableCell>

      {/* End Time — italic to signal live value */}
      <TableCell className="font-mono tabular-nums text-muted-foreground italic">
        {endTime}
      </TableCell>

      {/* Duration — bold mono */}
      <TableCell className="whitespace-nowrap font-bold font-mono">
        {formatDuration(duration)}
      </TableCell>

      {/* Status */}
      <TableCell>
        <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          En curso
        </span>
      </TableCell>

      {/* Actions — same column as TimeEntryRow */}
      <TableCell className="w-24">
        {onSplit && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onSplit}
                    disabled={!!splitDisabledReason}
                    aria-label="Dividir el timer en curso"
                    className="min-w-[44px] min-h-[44px] text-muted-foreground hover:text-foreground"
                  >
                    <Split className="w-4 h-4" />
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {splitDisabledReason ?? 'Dividir el timer en curso'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </TableCell>
    </TableRow>
  );
}
