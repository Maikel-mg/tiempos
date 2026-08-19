import { useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Proceso, TimeEntry } from '@/features/time-tracker/types';

export interface Reassignment {
  entryId: string;
  proceso: Proceso;
}

export interface PendingProcessReassignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Entradas vinculadas al pendiente (sin sincronizar) que deben reasignarse. */
  entries: TimeEntry[];
  /** Procesos del sistema a los que se puede reasignar. */
  processes: Proceso[];
  pendingNombre: string;
  pendingId: number;
  /** Devuelve la asignación elegida por el usuario. Si se cancela, no se llama. */
  onConfirm: (assignments: Reassignment[]) => Promise<void> | void;
}

function processKey(proceso: Proceso): string {
  return String(proceso.proceso);
}

function formatDate(date: string): string {
  return date.split('T')[0];
}

/**
 * Modal de reasignación previo a la eliminación de un Proceso Pendiente con
 * entradas vinculadas. Permite reasignar cada entrada a un proceso del sistema
 * (individualmente o en bloque) y confirma la eliminación solo cuando todas
 * tienen destino. Si el usuario cancela, no se elimina nada.
 */
export function PendingProcessReassignModal({
  open,
  onOpenChange,
  entries,
  processes,
  pendingNombre,
  pendingId,
  onConfirm,
}: PendingProcessReassignModalProps) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [bulkTarget, setBulkTarget] = useState<string>('');

  const processById = useMemo(() => {
    const map = new Map<string, Proceso>();
    for (const p of processes) map.set(processKey(p), p);
    return map;
  }, [processes]);

  const allAssigned = entries.length > 0 && entries.every((e) => selections[e.id]);

  const handleConfirm = useCallback(async () => {
    const assignments: Reassignment[] = [];
    for (const entry of entries) {
      const target = processById.get(selections[entry.id]);
      if (target) {
        assignments.push({ entryId: entry.id, proceso: target });
      }
    }
    if (assignments.length !== entries.length) return;
    await onConfirm(assignments);
    setSelections({});
    setBulkTarget('');
    onOpenChange(false);
  }, [entries, processById, selections, onConfirm, onOpenChange]);

  const reassignAll = useCallback(() => {
    if (!bulkTarget) return;
    setSelections((prev) => {
      const next = { ...prev };
      for (const entry of entries) next[entry.id] = bulkTarget;
      return next;
    });
  }, [bulkTarget, entries]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Reasignar antes de eliminar</DialogTitle>
          <DialogDescription>
            &quot;{pendingNombre}&quot; tiene {entries.length} entrada(s) sin sincronizar
            (ID provisional {pendingId}). Reasignalas a un proceso del sistema o cancelá.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[320px] overflow-y-auto">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{entry.taskName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {formatDate(entry.date)} · {entry.duration / 3600}h
                  {entry.description ? ` · ${entry.description}` : ''}
                </p>
              </div>
              <Select
                value={selections[entry.id] ?? ''}
                onValueChange={(v: string) => setSelections((prev) => ({ ...prev, [entry.id]: v }))}
              >
                <SelectTrigger aria-label="Reasignar entrada" className="w-56">
                  <SelectValue placeholder="Elegir proceso" />
                </SelectTrigger>
                <SelectContent>
                  {processes.map((p) => (
                    <SelectItem key={processKey(p)} value={processKey(p)}>
                      {p.nombre} — ID {p.proceso}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Select value={bulkTarget} onValueChange={setBulkTarget}>
            <SelectTrigger aria-label="Reasignar todas a" className="flex-1">
              <SelectValue placeholder="Reasignar todas a un proceso..." />
            </SelectTrigger>
            <SelectContent>
              {processes.map((p) => (
                <SelectItem key={processKey(p)} value={processKey(p)}>
                  {p.nombre} — ID {p.proceso}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={reassignAll} disabled={!bulkTarget}>
            Reasignar todas
          </Button>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!allAssigned}>
            Confirmar eliminación
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
