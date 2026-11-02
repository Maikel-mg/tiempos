import { Copy, Database, MoreVertical, Pencil, Play, Split, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { splitAffordance } from '@/features/time-tracker/lib/splitEntry';
import type { TimeEntry } from '@/features/time-tracker/types';

/** Acciones disponibles sobre un Registro de tiempo, iguales que en la tabla. */
export interface EntryActions {
  onEdit?: (entry: TimeEntry) => void;
  onPlay?: (entry: TimeEntry) => void;
  onDuplicate?: (entry: TimeEntry) => void;
  onSplit?: (entry: TimeEntry) => void;
  onSync?: (entry: TimeEntry) => void;
  onDelete?: (id: string) => void;
}

interface EntryActionsMenuProps {
  entry: TimeEntry;
  actions: EntryActions;
  className?: string;
}

/**
 * Menú de acciones por Registro de tiempo.
 *
 * «Dividir» se muestra siempre, deshabilitado con el motivo cuando no aplica: la
 * tabla lo esconde, aquí se explica por qué no está disponible.
 */
export function EntryActionsMenu({ entry, actions, className }: EntryActionsMenuProps) {
  const split = splitAffordance(entry);
  const splitReason = split.visible
    ? split.enabled
      ? null
      : split.reason
    : entry.synced
      ? 'ya sincronizado'
      : 'es un permiso';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className ?? 'h-6 w-6'}
          aria-label={`Acciones de ${entry.taskName}`}
          onClick={(event) => event.stopPropagation()}
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(event: React.MouseEvent) => event.stopPropagation()}>
        <DropdownMenuItem onClick={() => actions.onEdit?.(entry)}>
          <Pencil className="h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => actions.onPlay?.(entry)}>
          <Play className="h-4 w-4" />
          Play
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => actions.onDuplicate?.(entry)}>
          <Copy className="h-4 w-4" />
          Duplicar
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!split.visible || !split.enabled}
          onClick={() => actions.onSplit?.(entry)}
        >
          <Split className="h-4 w-4" />
          {split.visible && split.enabled ? 'Dividir' : `Dividir · ${splitReason}`}
        </DropdownMenuItem>
        {!entry.synced && (
          <DropdownMenuItem onClick={() => actions.onSync?.(entry)}>
            <Database className="h-4 w-4" />
            Sincronizar
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => actions.onDelete?.(entry.id)}>
          <Trash2 className="h-4 w-4" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
