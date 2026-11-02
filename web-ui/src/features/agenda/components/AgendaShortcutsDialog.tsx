import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AgendaShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GROUPS: Array<{ title: string; keys: Array<[string, string]> }> = [
  {
    title: 'Período',
    keys: [
      ['← →', 'Día o semana anterior / siguiente'],
      ['T', 'Hoy'],
      ['W', 'Alterna día / semana'],
      ['F', 'Foco en el selector de fechas'],
    ],
  },
  {
    title: 'Vistas',
    keys: [
      ['V', 'Rota a la siguiente vista'],
      ['1 2 3', 'Calendario, Agenda, Timeline'],
      ['N', 'Nuevo Registro de tiempo al final del día'],
    ],
  },
  {
    title: 'Entradas del día',
    keys: [
      ['↑ ↓', 'Entrada anterior / siguiente'],
      ['Home End', 'Primera / última'],
      ['Esc', 'Quitar la selección'],
      ['E', 'Editar'],
      ['D', 'Duplicar'],
      ['R', 'Play'],
      ['G', 'Guardar (sincronizar)'],
      ['S', 'Dividir'],
      ['Supr', 'Eliminar'],
    ],
  },
];

/** Chuleta de atajos de la Agenda. */
export function AgendaShortcutsDialog({ open, onOpenChange }: AgendaShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Atajos de la Agenda</DialogTitle>
          <DialogDescription>
            Funcionan cuando el foco no está en un campo de texto. Pulsa Esc para salir de un campo.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 sm:grid-cols-3">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </h3>
              <ul className="space-y-1.5">
                {group.keys.map(([keys, description]) => (
                  <li key={keys} className="flex items-baseline gap-2 text-sm">
                    <kbd className="shrink-0 rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                      {keys}
                    </kbd>
                    <span className="text-muted-foreground">{description}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
