import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { buildSplitHalves, planSplit, splitAvailability } from '../lib/splitEntry';
import type { TimeEntry } from '../types';

/**
 * Diálogo de "Dividir": parte un Registro de tiempo en dos por un punto concreto.
 *
 * La forma viene del prototipo (`?variant=A`, ver el issue del spec): una barra
 * temporal con el Registro completo y un tirador arrastrable, con la hora del
 * corte también editable a mano. El corte se lee en su sitio, sin traducir números
 * a una posición en el tiempo.
 *
 * El diálogo es un editor separado: no detiene ni modifica el Timer activo
 * (ADR 0002). Las dos entradas que devuelve son las que hay que guardar.
 */

export interface SplitEntryDialogProps {
  open: boolean;
  /** El Registro a dividir, o el anclaje del Timer activo (`date`/`startTime` reales). */
  entry: TimeEntry | null;
  /**
   * El Registro todavía no existe (es el Timer activo): se ofrece "Dividir" en vez
   * de "Guardar" y quien confirme se encarga de persistir la primera mitad.
   */
  live?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (halves: { first: TimeEntry; second: TimeEntry }) => Promise<void>;
}

const QUICK_CUTS = [
  { label: 'Un cuarto', ratio: 0.25 },
  { label: 'La mitad', ratio: 0.5 },
  { label: 'Tres cuartos', ratio: 0.75 },
];

const NUDGES = [-15, -5, 5, 15];

/**
 * Las acciones de Radix (cerrar con Escape, llevar el foco con las flechas) y las
 * de un tirador arrastrable (capturar el puntero) no existen en jsdom. Sin esto,
 * pulsar una flecha sobre el tirador rompe el test con una excepción no capturada.
 */
function installPointerCaptureStub(): void {
  if (typeof Element === 'undefined') return;
  const element = Element.prototype as unknown as {
    hasPointerCapture?: () => boolean;
    setPointerCapture?: () => void;
    releasePointerCapture?: () => void;
  };
  element.hasPointerCapture ??= () => false;
  element.setPointerCapture ??= () => undefined;
  element.releasePointerCapture ??= () => undefined;
}

installPointerCaptureStub();

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToHHMM(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
}

function formatDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year}`;
}

export function SplitEntryDialog({ open, entry, live = false, onOpenChange, onConfirm }: SplitEntryDialogProps) {
  const [cutMinutes, setCutMinutes] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cancelEditRef = useRef(false);
  const barRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const startMinutes = entry ? toMinutes(entry.startTime) : 0;
  const endMinutes = entry ? toMinutes(entry.endTime) : 0;
  const span = Math.max(1, endMinutes - startMinutes);

  const clamp = useCallback(
    (value: number) => Math.min(endMinutes - 1, Math.max(startMinutes + 1, Math.round(value))),
    [startMinutes, endMinutes],
  );

  // Al abrir, el corte arranca en la mitad del Registro, que es el caso común.
  useEffect(() => {
    if (!open || !entry) return;
    setCutMinutes(clamp(startMinutes + span / 2));
    setDragging(false);
    setDraft(null);
    setIsSubmitting(false);
    const frame = requestAnimationFrame(() => barRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, entry, clamp, startMinutes, span]);

  const availability = entry ? splitAvailability(entry) : { splittable: false as const, reason: '' };
  const plan = entry ? planSplit(entry, minutesToHHMM(cutMinutes)) : { ok: false as const, reason: '' };
  const isValid = availability.splittable && plan.ok;

  // Las dos mitades se calculan igual que se guardarán, para poder enseñarlas.
  const halves =
    entry && plan.ok
      ? buildSplitHalves(entry, plan.segments, { newId: '', now: '' })
      : null;

  const ratio = (cutMinutes - startMinutes) / span;

  const nudge = useCallback(
    (delta: number) => setCutMinutes((current) => clamp(current + delta)),
    [clamp],
  );

  const openCutEditor = useCallback(() => {
    cancelEditRef.current = false;
    setDraft(minutesToHHMM(cutMinutes));
  }, [cutMinutes]);

  const commitCutEditor = useCallback(() => {
    if (cancelEditRef.current) {
      cancelEditRef.current = false;
      setDraft(null);
      return;
    }
    setDraft((current) => {
      if (current) {
        const match = /^(\d{1,2}):(\d{2})/.exec(current.trim());
        if (match) setCutMinutes(clamp(Number(match[1]) * 60 + Number(match[2])));
      }
      return null;
    });
  }, [clamp]);

  const cancelCutEditor = useCallback(() => {
    cancelEditRef.current = true;
    setDraft(null);
  }, []);

  // Los atajos viven en el propio diálogo de Radix, que atrapa el foco: todo lo
  // que se teclea con el diálogo abierto pasa por aquí. Las flechas y `Tab`
  // siguen siendo de Radix (roving focus), por eso no se registran.
  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    // Mientras se escribe la hora, el teclado es del campo.
    if (draft !== null) return;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        nudge(event.shiftKey ? -5 : -1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        nudge(event.shiftKey ? 5 : 1);
        break;
      case 'm':
      case 'M':
        event.preventDefault();
        setCutMinutes(clamp(startMinutes + span / 2));
        break;
      case 'e':
      case 'E':
        event.preventDefault();
        openCutEditor();
        break;
      case 'Enter':
        if (!isSubmitting) {
          event.preventDefault();
          void handleConfirm();
        }
        break;
      default:
        break;
    }
  };

  const setFromClientX = (clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const position = (clientX - rect.left) / rect.width;
    setCutMinutes(clamp(startMinutes + position * span));
  };

  const handleConfirm = useCallback(async () => {
    if (!isValid || isSubmitting || !entry || !plan.ok || draft !== null) return;

    setIsSubmitting(true);
    try {
      const { newId, now } = { newId: crypto.randomUUID(), now: new Date().toISOString() };
      await onConfirm(buildSplitHalves(entry, plan.segments, { newId, now }));
      onOpenChange(false);
    } catch (error) {
      console.error('Error splitting entry:', error);
      toast.error('No se pudo dividir el Registro');
    } finally {
      setIsSubmitting(false);
    }
  }, [isValid, isSubmitting, entry, plan, draft, onConfirm, onOpenChange]);

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" onKeyDown={handleDialogKeyDown}>
        <DialogHeader>
          <DialogTitle>{live ? 'Dividir el timer en curso' : 'Dividir Registro de tiempo'}</DialogTitle>
          <DialogDescription>
            {entry.taskName} · {formatDate(entry.date)} · {entry.startTime}–{entry.endTime} (
            {formatMinutes(endMinutes - startMinutes)})
            {live && ' · la segunda mitad sigue corriendo'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="flex items-center justify-between gap-3 font-mono text-sm tabular-nums">
            <span className="text-muted-foreground">{entry.startTime}</span>

            {draft !== null ? (
              <Input
                ref={inputRef}
                type="time"
                step={60}
                aria-label="Hora del corte"
                autoFocus
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commitCutEditor}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitCutEditor();
                  } else if (event.key === 'Escape') {
                    event.preventDefault();
                    cancelCutEditor();
                  }
                }}
                className="h-9 w-28 text-center font-mono text-base tabular-nums"
              />
            ) : (
              <button
                type="button"
                onClick={openCutEditor}
                title="Escribir la hora del corte (E)"
                className="rounded bg-foreground px-2 py-0.5 text-base font-semibold text-background transition-opacity hover:opacity-80"
              >
                {minutesToHHMM(cutMinutes)}
              </button>
            )}

            <span className="text-muted-foreground">{entry.endTime}</span>
          </div>

          <div
            className="relative h-14 touch-none select-none overflow-hidden rounded-lg bg-muted"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setDragging(true);
              setFromClientX(event.clientX);
            }}
            onPointerMove={(event) => {
              if (dragging) setFromClientX(event.clientX);
            }}
            onPointerUp={() => setDragging(false)}
          >
            <div className="absolute inset-y-0 left-0 bg-blue-500/90" style={{ width: `${ratio * 100}%` }} />
            <div
              className="absolute inset-y-0 right-0 bg-slate-300 dark:bg-slate-700"
              style={{ width: `${(1 - ratio) * 100}%` }}
            />

            <div
              className="pointer-events-none absolute inset-y-0 flex items-center justify-center text-sm font-semibold text-white/90"
              style={{ left: 0, width: `${ratio * 100}%` }}
            >
              {ratio > 0.12 ? '1' : ''}
            </div>
            <div
              className="pointer-events-none absolute inset-y-0 flex items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-300"
              style={{ left: `${ratio * 100}%`, width: `${(1 - ratio) * 100}%` }}
            >
              {1 - ratio > 0.12 ? '2' : ''}
            </div>

            <div
              ref={barRef}
              role="slider"
              tabIndex={0}
              aria-label="Punto de corte"
              aria-valuemin={startMinutes + 1}
              aria-valuemax={Math.max(startMinutes + 2, endMinutes - 1)}
              aria-valuenow={cutMinutes}
              aria-valuetext={minutesToHHMM(cutMinutes)}
              className="absolute top-1/2 z-10 h-11 w-5 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full border-2 border-background bg-foreground shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ left: `${ratio * 100}%` }}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900 dark:bg-blue-950/30">
              <div className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                {live ? 'Primera mitad (se guarda ahora)' : 'Mitad 1'}
              </div>
              <div className="mt-1 font-mono text-sm tabular-nums">
                {entry.startTime} – {minutesToHHMM(cutMinutes)}
              </div>
              <div className="text-sm text-muted-foreground">
                {halves ? formatMinutes(halves.first.duration / 60) : '—'}
              </div>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {live ? 'Segunda mitad (sigue corriendo)' : 'Mitad 2'}
              </div>
              <div className="mt-1 font-mono text-sm tabular-nums">
                {minutesToHHMM(cutMinutes)} – {entry.endTime}
              </div>
              <div className="text-sm text-muted-foreground">
                {halves ? formatMinutes(halves.second.duration / 60) : '—'}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Atajos:</span>
              {QUICK_CUTS.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setCutMinutes(clamp(startMinutes + span * preset.ratio))}
                >
                  {preset.label}
                </Button>
              ))}
              <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
              {NUDGES.map((delta) => (
                <Button
                  key={delta}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => nudge(delta)}
                >
                  {delta > 0 ? `+${delta}` : delta}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Arrastra el tirador · ← → 1 min · Shift 5 min · M la mitad · E escribir la hora
            </p>
          </div>

          {!availability.splittable && <p className="text-sm text-destructive">{availability.reason}</p>}
          {availability.splittable && !plan.ok && <p className="text-sm text-destructive">{plan.reason}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="button" disabled={!isValid || isSubmitting} onClick={handleConfirm}>
            {isSubmitting ? 'Dividiendo...' : live ? 'Dividir y seguir' : 'Dividir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
