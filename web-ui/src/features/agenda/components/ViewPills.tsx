import { AGENDA_VIEWS, type AgendaViewKind } from '../lib/agendaViews';

interface ViewPillsProps {
  value: AgendaViewKind;
  available: ReadonlyArray<AgendaViewKind>;
  onChange: (view: AgendaViewKind) => void;
}

/** Píldoras de vista: Calendario, Agenda y Timeline sobre el mismo período. */
export function ViewPills({ value, available, onChange }: ViewPillsProps) {
  return (
    <div role="tablist" aria-label="Vista del período" className="inline-flex rounded-lg border bg-muted/40 p-0.5">
      {AGENDA_VIEWS.filter((view) => available.includes(view.key)).map((view) => (
        <button
          key={view.key}
          role="tab"
          aria-selected={value === view.key}
          onClick={() => onChange(view.key)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            value === view.key ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}
