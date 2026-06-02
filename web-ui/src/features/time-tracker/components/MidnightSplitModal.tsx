import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { SplitProposal } from '../lib/timerCrossingDetector';

export interface MidnightSplitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: SplitProposal[];
  onSplit: () => void;
  onKeepSingle: () => void;
}

export function MidnightSplitModal({ open, onOpenChange, proposal, onSplit, onKeepSingle }: MidnightSplitModalProps) {
  const handleClose = () => {
    onKeepSingle();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={handleClose}>
        <DialogHeader>
          <DialogTitle>Cruza la medianoche</DialogTitle>
          <DialogDescription>
            El temporizador comenzó en un día y terminó en otro. ¿Cómo quieres registrar el tiempo?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 my-4">
          {proposal.map((split, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span>{split.date}</span>
              <span>{split.startTime} - {split.endTime}</span>
              <span className="font-medium">{split.minutes} min</span>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Dejar como uno solo
          </Button>
          <Button onClick={() => { onSplit(); onOpenChange(false); }}>
            Dividir en {proposal.length} TimeEntries
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
