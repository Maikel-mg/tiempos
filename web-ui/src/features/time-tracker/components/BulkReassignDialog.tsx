import { useState, useEffect } from 'react';
import { AlertCircle, Loader2, ArrowLeftRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProcessSelectorButton } from './ProcessSelectorButton';
import type { Proceso } from '../types';

interface BulkReassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Registros que se van a cambiar. */
  count: number;
  /** Registros de la selección ya sincronizados, que se quedan como están. */
  skippedSyncedCount: number;
  onConfirm: (proceso: Proceso) => Promise<void>;
}

/** Cambia la tarea de los Registros seleccionados de una sola vez. */
export function BulkReassignDialog({
  open,
  onOpenChange,
  count,
  skippedSyncedCount,
  onConfirm,
}: BulkReassignDialogProps) {
  const [task, setTask] = useState<Proceso | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Cada apertura empieza sin tarea elegida.
  useEffect(() => {
    if (open) {
      setTask(null);
      setIsSaving(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!task) return;
    setIsSaving(true);
    try {
      await onConfirm(task);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Cambiar tarea de {count} registro{count !== 1 ? 's' : ''}</DialogTitle>
          <DialogDescription>
            Se reasignan los registros seleccionados a la tarea que elijas. No se toca nada más.
          </DialogDescription>
        </DialogHeader>

        <ProcessSelectorButton value={task} onChange={setTask} disabled={isSaving} className="w-full" />

        {skippedSyncedCount > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Los {skippedSyncedCount} registros ya sincronizados no se cambian: la base de datos ya
              los tiene con su tarea actual.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isSaving || !task || count === 0}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ArrowLeftRight className="w-4 h-4 mr-2" />
            )}
            Cambiar tarea
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
