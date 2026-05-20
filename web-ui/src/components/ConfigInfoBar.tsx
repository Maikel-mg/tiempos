import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { User, AlertCircle, Settings, CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { wizardConfig, phaseByMonthConfig } from '@/config/stores';

interface ConfigInfoBarProps {
  selectedMonth?: Date | null;
  onApplySuggestion?: (fase: string) => void;
}

/**
 * ConfigInfoBar - Displays current wizard configuration in a compact horizontal layout
 *
 * Shows usuario, tipoHora, and fase with appropriate badges.
 * When config is empty, shows warning state with link to settings.
 * When selectedMonth is provided, can show fase suggestions from phaseByMonthConfig.
 */
export function ConfigInfoBar({ selectedMonth, onApplySuggestion }: ConfigInfoBarProps) {
  const [config, setConfig] = useState(wizardConfig.get());
  const [phaseConfig, setPhaseConfig] = useState(phaseByMonthConfig.get());

  // Subscribe to wizardConfig changes reactively
  useEffect(() => {
    const unsubscribe = wizardConfig.subscribe((newConfig) => {
      setConfig(newConfig);
    });
    return unsubscribe;
  }, []);

  // Subscribe to phaseByMonthConfig changes reactively
  useEffect(() => {
    const unsubscribe = phaseByMonthConfig.subscribe((newConfig) => {
      setPhaseConfig(newConfig);
    });
    return unsubscribe;
  }, []);

  // Empty state detection: usuario empty, tipoHora default '11', fase empty
  const isEmpty = !config?.usuario && config?.tipoHora === '11' && !config?.fase;

  // Calculate suggested fase for selected month
  const suggestion = useMemo(() => {
    if (!selectedMonth || !phaseConfig?.phases) {
      return null;
    }

    const monthKey = selectedMonth.toISOString().slice(0, 7);
    const storedPhases = phaseConfig.phases;
    const suggestedFase = storedPhases[monthKey];

    if (!suggestedFase || suggestedFase === config?.fase) {
      return null;
    }

    const monthName = selectedMonth.toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric'
    });

    return {
      fase: suggestedFase,
      monthName
    };
  }, [selectedMonth, phaseConfig?.phases, config?.fase]);

  // Empty state
  if (isEmpty) {
    return (
      <Alert variant="warning" className="flex items-center gap-2 p-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <AlertTitle className="text-sm shrink-0">
          Sin configurar
        </AlertTitle>
        <div className="flex-1" />
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs shrink-0"
          asChild
        >
          <Link to="/settings">Configurar</Link>
        </Button>
      </Alert>
    );
  }

  // Configured state
  return (
    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border border-border">
      <User className="w-4 h-4 text-muted-foreground shrink-0" />

      <div className="flex items-center gap-2 flex-wrap shrink-0">
        {config?.usuario && (
          <Badge variant="secondary" className="text-xs">
            {config.usuario}
          </Badge>
        )}

        {config?.tipoHora && (
          <Badge variant="outline" className="text-xs">
            ⏱ {config.tipoHora}
          </Badge>
        )}

        {config?.fase && (
          <Badge variant="default" className="text-xs">
            📋 {config.fase}
          </Badge>
        )}
      </div>

      {suggestion && (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />
            Fase para {suggestion.monthName}: {suggestion.fase} (sugerida)
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-xs shrink-0"
            onClick={() => onApplySuggestion?.(suggestion.fase)}
          >
            Aplicar
          </Button>
        </div>
      )}

      <div className="flex-1" />

      <Button
        variant="link"
        size="sm"
        className="h-auto p-0 text-xs shrink-0"
        asChild
      >
        <Link to="/settings">
          <Settings className="w-3 h-3 mr-1" />
          Configurar
        </Link>
      </Button>
    </div>
  );
}
