import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProcessSelectorButton } from '@/features/time-tracker/components/ProcessSelectorButton';
import { formatDurationShort, parseHHMM } from '@/lib/format';
import type { Proceso } from '@/features/time-tracker/types';
import type { EntryDraft } from '../types';

interface InlineComposerProps {
  date: string;
  startTime: string;
  endTime: string;
  /** Tarea ya elegida cuando el alta viene de una fila del Timeline. */
  preset?: Proceso;
  onCancel: () => void;
  onSubmit: (draft: EntryDraft) => Promise<void>;
}

/**
 * Alta manual dentro del plan: descripción, Tarea y horas ya rellenadas desde el
 * hueco pulsado. Enter guarda, Esc cancela.
 */
export function InlineComposer({ date, startTime, endTime, preset, onCancel, onSubmit }: InlineComposerProps) {
  const [task, setTask] = useState<Proceso | null>(preset ?? null);
  const [description, setDescription] = useState('');
  const [start, setStart] = useState(startTime);
  const [end, setEnd] = useState(endTime);
  const [busy, setBusy] = useState(false);

  const minutes = Math.max(0, parseHHMM(end) - parseHHMM(start));
  const canSave = task !== null && minutes > 0 && !busy;

  const save = async () => {
    if (!task || !canSave) return;
    setBusy(true);
    try {
      await onSubmit({
        taskId: task.proceso,
        taskName: task.nombre,
        date,
        startTime: start,
        endTime: end,
        description: description.trim() || undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border-2 border-dashed border-primary/50 bg-card p-2 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="¿Qué hiciste? (Enter para guardar)"
          aria-label="Descripción del Registro de tiempo"
          autoFocus
          className="h-8 min-w-0 flex-1 text-sm"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void save();
            }
            if (event.key === 'Escape') {
              event.stopPropagation();
              onCancel();
            }
          }}
        />
        <ProcessSelectorButton value={task} onChange={setTask} className="w-56" />
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <Input
          type="time"
          value={start}
          onChange={(event) => setStart(event.target.value)}
          className="h-7 w-24 font-mono text-xs tabular-nums"
          aria-label="Hora de inicio"
        />
        <span className="text-xs text-muted-foreground">→</span>
        <Input
          type="time"
          value={end}
          onChange={(event) => setEnd(event.target.value)}
          className="h-7 w-24 font-mono text-xs tabular-nums"
          aria-label="Hora de fin"
        />
        <span className="font-mono text-[11px] text-muted-foreground">
          {minutes > 0 ? formatDurationShort(minutes * 60) : '—'}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => void save()} disabled={!canSave}>
            <Check className="h-3.5 w-3.5" />
            Guardar
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-1.5" onClick={onCancel} aria-label="Cancelar alta">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
