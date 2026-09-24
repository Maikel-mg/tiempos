import { forwardRef, type PointerEvent as ReactPointerEvent } from 'react';
import { cutTimeFromMinutes } from '../lib/splitEntry';

/**
 * Barra temporal del diálogo de "Dividir": el Registro completo en dos tramos y un
 * tirador arrastrable en el punto de corte.
 *
 * Presentacional: recibe la geometría ya resuelta y avisa de los gestos. El estado
 * del corte y las reglas viven fuera.
 */
export interface SplitTimelineProps {
  /** Minutos del día donde arranca el Registro. */
  startMinutes: number;
  /** Minutos del día donde acaba el Registro. */
  endMinutes: number;
  /** Minutos del día del corte. */
  cutMinutes: number;
  /** Posición del corte en el ancho de la barra, de 0 a 1. */
  ratio: number;
  dragging: boolean;
  onDragChange: (dragging: boolean) => void;
  /** Nuevo corte a partir de la posición del puntero y el rectángulo de la barra. */
  onScrub: (clientX: number, rect: DOMRect) => void;
}

export const SplitTimeline = forwardRef<HTMLDivElement, SplitTimelineProps>(function SplitTimeline(
  { startMinutes, endMinutes, cutMinutes, ratio, dragging, onDragChange, onScrub },
  barRef,
) {
  /**
   * Capturar el puntero es lo que permite arrastrar el tirador aunque el cursor
   * salga de la barra. No todos los entornos lo implementan (jsdom no), así que se
   * comprueba antes de usarlo en vez de asumirlo.
   */
  const capturePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  return (
    <div
      className="relative h-14 touch-none select-none overflow-hidden rounded-lg bg-muted"
      onPointerDown={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        capturePointer(event);
        onDragChange(true);
        onScrub(event.clientX, rect);
      }}
      onPointerMove={(event) => {
        if (dragging) onScrub(event.clientX, event.currentTarget.getBoundingClientRect());
      }}
      onPointerUp={(event) => {
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        onDragChange(false);
      }}
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
        aria-valuetext={cutTimeFromMinutes(cutMinutes)}
        className="absolute top-1/2 z-10 h-11 w-5 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full border-2 border-background bg-foreground shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ left: `${ratio * 100}%` }}
      />
    </div>
  );
});
