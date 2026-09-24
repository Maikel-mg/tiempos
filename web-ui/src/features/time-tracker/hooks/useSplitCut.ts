import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { cutTimeFromMinutes, planSplit, splitAvailability, toHHMM } from '../lib/splitEntry';
import type { TimeEntry } from '../types';

/**
 * Estado y reglas del diálogo de "Dividir": dónde está el corte, si el plan es
 * válido y cómo responde al teclado.
 *
 * Vive fuera del componente para que éste sólo pinte: la decisión de si un corte
 * vale la toma `splitEntry`, y aquí sólo se coordina.
 */

/** Minutos del día de un `HH:MM`; sólo se usa para posicionar y acotar el corte. */
function approximateMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export interface UseSplitCutParams {
  open: boolean;
  entry: TimeEntry | null;
  onConfirm: (cut: { entryId: string; cutTime: string }) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}

export function useSplitCut({ open, entry, onConfirm, onOpenChange }: UseSplitCutParams) {
  const [cutMinutes, setCutMinutes] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cancelEditRef = useRef(false);
  const barRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const startMinutes = entry ? approximateMinutes(entry.startTime) : 0;
  const endMinutes = entry ? approximateMinutes(entry.endTime) : 0;
  const span = Math.max(1, endMinutes - startMinutes);

  const clamp = useCallback(
    (value: number) => {
      if (!Number.isFinite(value)) return startMinutes + Math.floor(span / 2);
      return Math.min(endMinutes - 1, Math.max(startMinutes + 1, Math.round(value)));
    },
    [startMinutes, endMinutes, span],
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
  const plan = entry ? planSplit(entry, toHHMM(cutMinutes)) : { ok: false as const, reason: '' };
  const isValid = availability.splittable && plan.ok;
  const segments = plan.ok ? plan.segments : null;
  /** Motivo del plan cuando el corte no vale (fuera del intervalo, etc.). */
  const planReason = plan.ok ? null : plan.reason;
  const ratio = (cutMinutes - startMinutes) / span;

  const nudge = useCallback(
    (delta: number) => setCutMinutes((current) => clamp(current + delta)),
    [clamp],
  );

  const openCutEditor = useCallback(() => {
    cancelEditRef.current = false;
    setDraft(cutTimeFromMinutes(cutMinutes));
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

  const confirm = useCallback(async () => {
    if (!isValid || isSubmitting || !entry || draft !== null) return;

    setIsSubmitting(true);
    try {
      await onConfirm({ entryId: entry.id, cutTime: toHHMM(cutMinutes) });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [isValid, isSubmitting, entry, draft, cutMinutes, onConfirm, onOpenChange]);

  /** Atajos del diálogo: las flechas mueven el corte, M lo centra, E lo escribe. */
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
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
          void confirm();
        }
        break;
      default:
        break;
    }
  };

  return {
    cutMinutes,
    setCutMinutes,
    dragging,
    setDragging,
    draft,
    setDraft,
    isSubmitting,
    startMinutes,
    endMinutes,
    span,
    clamp,
    availability,
    isValid,
    segments,
    planReason,
    ratio,
    nudge,
    openCutEditor,
    commitCutEditor,
    cancelCutEditor,
    confirm,
    handleKeyDown,
    barRef,
    inputRef,
  };
}
