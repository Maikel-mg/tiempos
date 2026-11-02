/** Vistas del plan: la misma información del período, tres lecturas distintas. */

export type AgendaViewKind = 'calendar' | 'agenda' | 'timeline';

export const AGENDA_VIEWS: ReadonlyArray<{ key: AgendaViewKind; label: string }> = [
  { key: 'calendar', label: 'Calendario' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'timeline', label: 'Timeline' },
];

export const DEFAULT_AGENDA_VIEW: AgendaViewKind = 'agenda';

/** Vistas ya construidas; crece a medida que cada una se entrega. */
export const IMPLEMENTED_AGENDA_VIEWS: ReadonlyArray<AgendaViewKind> = ['agenda', 'timeline'];
