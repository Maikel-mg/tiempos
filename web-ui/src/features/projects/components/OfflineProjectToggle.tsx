import { Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { OfflineProjectSelection } from '@/features/time-tracker/types';
import type { Project } from '../types';

export interface OfflineProjectToggleProps {
  project: Project;
  selection?: OfflineProjectSelection;
  marking?: boolean;
  disabled?: boolean;
  onToggle: (mark: boolean) => void;
}

/**
 * Toggle "disponible offline" para una fila de la tabla de Proyectos.
 * Muestra el estado de la selección (Sincronizado / Pendiente de sincronizar)
 * y bloquea el marcado cuando no hay usuario configurado.
 */
export function OfflineProjectToggle({
  project,
  selection,
  marking = false,
  disabled = false,
  onToggle,
}: OfflineProjectToggleProps) {
  const isOffline = Boolean(selection);

  const switchControl = marking ? (
    <Loader2
      className="h-5 w-5 animate-spin text-muted-foreground"
      aria-label="Marcando proyecto"
    />
  ) : (
    <Switch
      aria-label={`Disponible offline: ${project.NomProy}`}
      checked={isOffline}
      disabled={disabled}
      onClick={(event) => event.stopPropagation()}
      onCheckedChange={(checked) => onToggle(checked)}
    />
  );

  const badge = selection ? (
    selection.status === 'sincronizado' ? (
      <Badge variant="success">Sincronizado</Badge>
    ) : (
      <Badge variant="warning">Pendiente de sincronizar</Badge>
    )
  ) : null;

  return (
    <TooltipProvider>
      <div className="flex items-center justify-center gap-2">
        {disabled ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>{switchControl}</TooltipTrigger>
            <TooltipContent>Configura un usuario en Ajustes</TooltipContent>
          </Tooltip>
        ) : (
          switchControl
        )}
        {badge}
      </div>
    </TooltipProvider>
  );
}
