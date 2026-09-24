import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { useSplitCut } from '../hooks/useSplitCut';
import type { TimeEntry } from '../types';
import { SplitCutHeader } from './SplitCutHeader';
import { SplitPreview, formatMinutes } from './SplitPreview';
import { SplitTimeline } from './SplitTimeline';

/**
 * Diálogo de "Dividir": parte un Registro de tiempo en dos por un punto concreto.
 *
 * La forma viene del prototipo (`?variant=A`, ver el issue del spec): una barra
 * temporal con el Registro completo y un tirador arrastrable, con la hora del
 * corte también editable a mano. El corte se lee en su sitio, sin traducir números
 * a una posición en el tiempo.
 *
 * Sólo decide **dónde** se corta: devuelve la identidad del Registro y la hora del
 * corte. Construir y guardar las mitades es de quien persiste, porque el
 * identificador de la mitad nueva lo asigna esa capa y no este diálogo.
 *
 * Es un editor separado: no detiene ni modifica el Timer activo (ADR 0002).
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
  /** El corte elegido, sin construir: `{ entryId, cutTime }`. */
  onConfirm: (cut: { entryId: string; cutTime: string }) => Promise<void>;
}

export function SplitEntryDialog({ open, entry, live = false, onOpenChange, onConfirm }: SplitEntryDialogProps) {
  const cut = useSplitCut({
    open,
    entry,
    onConfirm: async (payload) => {
      try {
        await onConfirm(payload);
      } catch (error) {
        console.error('Error splitting entry:', error);
        toast.error('No se pudo dividir el Registro');
        throw error;
      }
    },
    onOpenChange,
  });

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" onKeyDown={cut.handleKeyDown}>
        <SplitCutHeader
          live={live}
          taskName={entry.taskName}
          date={entry.date}
          startTime={entry.startTime}
          endTime={entry.endTime}
          spanLabel={formatMinutes(cut.endMinutes - cut.startMinutes)}
          cutMinutes={cut.cutMinutes}
          draft={cut.draft}
          inputRef={cut.inputRef}
          onDraftChange={cut.setDraft}
          onCommit={cut.commitCutEditor}
          onCancel={cut.cancelCutEditor}
          onOpenEditor={cut.openCutEditor}
        />

        <div className="space-y-5 py-1">
          <SplitTimeline
            ref={cut.barRef}
            startMinutes={cut.startMinutes}
            endMinutes={cut.endMinutes}
            cutMinutes={cut.cutMinutes}
            ratio={cut.ratio}
            onScrub={(clientX, rect) => {
              if (rect.width === 0) return;
              const position = (clientX - rect.left) / rect.width;
              cut.setCutMinutes(cut.clamp(cut.startMinutes + position * cut.span));
            }}
            onDragChange={cut.setDragging}
            dragging={cut.dragging}
          />

          <SplitPreview
            startTime={entry.startTime}
            endTime={entry.endTime}
            cutMinutes={cut.cutMinutes}
            firstMinutes={cut.segments ? cut.segments[0].minutes : null}
            secondMinutes={cut.segments ? cut.segments[1].minutes : null}
            live={live}
            onQuickCut={(presetRatio) => cut.setCutMinutes(cut.clamp(cut.startMinutes + cut.span * presetRatio))}
            onNudge={cut.nudge}
          />

          {!cut.availability.splittable && <p className="text-sm text-destructive">{cut.availability.reason}</p>}
          {cut.availability.splittable && cut.planReason !== null && (
            <p className="text-sm text-destructive">{cut.planReason}</p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={cut.isSubmitting}>
            Cancelar
          </Button>
          <Button type="button" disabled={!cut.isValid || cut.isSubmitting} onClick={() => void cut.confirm()}>
            {cut.isSubmitting ? 'Dividiendo...' : live ? 'Dividir y seguir' : 'Dividir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
