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
  removalBlocked?: boolean;
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
  removalBlocked = false,
  onToggle,
}: OfflineProjectToggleProps) {
  const isOffline = Boolean(selection);
  const isSwitchDisabled = disabled || (isOffline && removalBlocked);

  const tooltipMessage = disabled
    ? 'Configura un usuario en Ajustes'
    : removalBlocked && isOffline
      ? 'No se puede desmarcar: tiene Entradas de Tiempo pendientes de sincronización'
      : null;

  const switchControl = marking ? (
    <Loader2
      className="h-5 w-5 animate-spin text-muted-foreground"
      aria-label="Marcando proyecto"
    />
  ) : (
    <Switch
      aria-label={`Disponible offline: ${project.NomProy}`}
      checked={isOffline}
      disabled={isSwitchDisabled}
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
        {tooltipMessage ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>{switchControl}</TooltipTrigger>
            <TooltipContent>{tooltipMessage}</TooltipContent>
          </Tooltip>
        ) : (
          switchControl
        )}
        {badge}
      </div>
    </TooltipProvider>
  );
}
