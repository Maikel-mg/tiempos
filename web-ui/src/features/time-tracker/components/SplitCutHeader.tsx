import type { RefObject } from 'react';
import { Input } from '@/components/ui/input';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cutTimeFromMinutes } from '../lib/splitEntry';

/**
 * Cabecera del diálogo de "Dividir": título, datos del Registro y la hora del corte,
 * que se lee en su sitio y se puede escribir con la tecla E.
 *
 * Presentacional: el estado del corte y del campo viven en el diálogo.
 */

export interface SplitCutHeaderProps {
  live: boolean;
  taskName: string;
  date: string;
  startTime: string;
  endTime: string;
  /** Duración del Registro en minutos, ya formateada. */
  spanLabel: string;
  cutMinutes: number;
  /** Borrador del campo de hora, o `null` si no se está editando. */
  draft: string | null;
  inputRef: RefObject<HTMLInputElement>;
  onDraftChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  onOpenEditor: () => void;
}

function formatDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

export function SplitCutHeader({
  live,
  taskName,
  date,
  startTime,
  endTime,
  spanLabel,
  cutMinutes,
  draft,
  inputRef,
  onDraftChange,
  onCommit,
  onCancel,
  onOpenEditor,
}: SplitCutHeaderProps) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>{live ? 'Dividir el timer en curso' : 'Dividir Registro de tiempo'}</DialogTitle>
        <DialogDescription>
          {taskName} · {formatDate(date)} · {startTime}–{endTime} ({spanLabel})
          {live && ' · la segunda mitad sigue corriendo'}
        </DialogDescription>
      </DialogHeader>

      <div className="flex items-center justify-between gap-3 font-mono text-sm tabular-nums">
        <span className="text-muted-foreground">{startTime}</span>

        {draft !== null ? (
          <Input
            ref={inputRef}
            type="time"
            step={60}
            aria-label="Hora del corte"
            autoFocus
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onBlur={onCommit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onCommit();
              } else if (event.key === 'Escape') {
                event.preventDefault();
                onCancel();
              }
            }}
            className="h-9 w-28 text-center font-mono text-base tabular-nums"
          />
        ) : (
          <button
            type="button"
            onClick={onOpenEditor}
            title="Escribir la hora del corte (E)"
            className="rounded bg-foreground px-2 py-0.5 text-base font-semibold text-background transition-opacity hover:opacity-80"
          >
            {cutTimeFromMinutes(cutMinutes)}
          </button>
        )}

        <span className="text-muted-foreground">{endTime}</span>
      </div>
    </>
  );
}
