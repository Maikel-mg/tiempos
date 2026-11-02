import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_AGENDA_VIEW, type AgendaViewKind } from '../lib/agendaViews';
import type { PlanMode } from '../lib/planRange';

const STORAGE_KEY = 'agenda.preferences';

interface AgendaPreferences {
  view: AgendaViewKind;
  mode: PlanMode;
}

const DEFAULTS: AgendaPreferences = { view: DEFAULT_AGENDA_VIEW, mode: 'day' };

function read(): AgendaPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<AgendaPreferences>;
    return {
      view: parsed.view ?? DEFAULTS.view,
      mode: parsed.mode === 'week' ? 'week' : 'day',
    };
  } catch {
    return DEFAULTS;
  }
}

/**
 * Vista y modo elegidos en la Agenda, recordados entre sesiones.
 *
 * Los valores por defecto son Agenda y día: la lectura del día es la tarea
 * principal de la pantalla. El día visible no se persiste.
 */
export function useAgendaPreferences() {
  const [preferences, setPreferences] = useState<AgendaPreferences>(read);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Sin almacenamiento disponible la Agenda funciona igual, solo no recuerda.
    }
  }, [preferences]);

  const setView = useCallback((view: AgendaViewKind) => {
    setPreferences((current) => ({ ...current, view }));
  }, []);

  const setMode = useCallback((mode: PlanMode) => {
    setPreferences((current) => ({ ...current, mode }));
  }, []);

  return { view: preferences.view, mode: preferences.mode, setView, setMode };
}
