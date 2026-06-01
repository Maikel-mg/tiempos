import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { TaskProposal } from '@/domain/proposals/extract-proposals';

export interface SyncConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: TaskProposal | null;
  isSyncing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SyncConfirmationDialog({
  open,
  onOpenChange,
  proposal,
  isSyncing,
  onConfirm,
  onCancel,
}: SyncConfirmationDialogProps) {
  if (!proposal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={isSyncing ? undefined : onCancel} className="max-w-lg">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-2xl font-bold">Sincronizar con Clockify</DialogTitle>
          <DialogDescription className="text-base mt-2">
            Se creará una tarea en Clockify y se reasignarán las entradas de tiempo asociadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-6">
          <div className="flex justify-between text-base">
            <span className="text-muted-foreground">Nombre:</span>
            <span className="font-semibold">{proposal.proposedName}</span>
          </div>
          <div className="flex justify-between text-base">
            <span className="text-muted-foreground">Proyecto:</span>
            <span className="font-semibold">{proposal.projectCode || '-'}</span>
          </div>
          <div className="flex justify-between text-base">
            <span className="text-muted-foreground">Entradas:</span>
            <span className="font-semibold">{proposal.entryCount}</span>
          </div>
          <div className="flex justify-between text-base">
            <span className="text-muted-foreground">Horas totales:</span>
            <span className="font-semibold">{Math.round(proposal.totalHours)}h</span>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onCancel} disabled={isSyncing} size="lg">
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={isSyncing} size="lg">
            {isSyncing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              'Confirmar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
