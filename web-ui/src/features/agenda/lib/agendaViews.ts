import type { AgendaViewKind } from '../types';

/** Vistas del plan en el orden de las píldoras. */

export const AGENDA_VIEWS: ReadonlyArray<{ key: AgendaViewKind; label: string }> = [
  { key: 'calendar', label: 'Calendario' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'timeline', label: 'Timeline' },
];

export const DEFAULT_AGENDA_VIEW: AgendaViewKind = 'agenda';

/** Orden de las vistas, como lista de claves. */
export const AGENDA_VIEW_ORDER: ReadonlyArray<AgendaViewKind> = AGENDA_VIEWS.map((view) => view.key);
