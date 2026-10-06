import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { proposalConfig } from '@/config/stores';
import { extractProposalsFromLocal } from '@/domain/proposals/extract-local-proposals';
import type { TaskProposal } from '@/domain/proposals/task-proposal';
import type { TimeEntry } from '../types';

export interface UseProposalsParams {
  /** Registros actuales; de aquí salen las propuestas y los que se reasignan. */
  entries: TimeEntry[];
  /** Persiste los cambios de cada Registro reasignado. */
  updateEntry: (id: string, data: Partial<TimeEntry>) => Promise<TimeEntry | null>;
}

/**
 * Propuestas de tarea: estado del modal, propuestas extraídas de las entradas del
 * mes en curso y acción de aceptar (reasignar las entradas no sincronizadas).
 *
 * Sólo orquesta el extractor puro (`extractProposalsFromLocal`) y la configuración
 * del umbral (`proposalConfig`); el comportamiento es el mismo que tenía la página.
 */
export function useProposals({ entries, updateEntry }: UseProposalsParams) {
  const [proposalModalOpen, setProposalModalOpen] = useState(false);

  const proposals = useMemo(() => {
    // Solo entradas del mes actual
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startDay = start.getFullYear() * 10000 + (start.getMonth() + 1) * 100 + start.getDate();
    const endDay = end.getFullYear() * 10000 + (end.getMonth() + 1) * 100 + end.getDate();

    const monthEntries = entries.filter(e => {
      const d = new Date(e.date + 'T12:00:00');
      const entryDay = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      return entryDay >= startDay && entryDay <= endDay;
    });

    const threshold = proposalConfig.get()?.thresholdHours ?? 8;
    return extractProposalsFromLocal(monthEntries, threshold);
  }, [entries]);

  /**
   * Acepta una propuesta: reasigna las entradas no confirmadas en SQL Server
   * (`synced !== true`) del grupo al proceso elegido.
   */
  const handleAcceptProposal = useCallback(async (
    proposal: TaskProposal,
    processId: string
  ) => {
    const newTaskId = Number(processId);
    if (!Number.isFinite(newTaskId) || newTaskId <= 0) {
      toast.error('ID de proceso inválido');
      return;
    }

    // Reasignar solo entries no confirmadas en SQL Server (synced !== true)
    // que pertenezcan a este grupo (mismo genericTask + descripción normalizada)
    const toReassign = entries.filter(e =>
      proposal.entryIds.includes(e.id) && !e.synced
    );

    if (toReassign.length === 0) {
      toast.info('No hay entradas pendientes para reasignar');
      return;
    }

    try {
      for (const entry of toReassign) {
        await updateEntry(entry.id, {
          taskId: newTaskId,
          taskName: proposal.proposedName,
          proceso: { ...entry.proceso, proceso: newTaskId, nombre: proposal.proposedName },
        });
      }
      toast.success(`${toReassign.length} entrada(s) reasignada(s) a "${proposal.proposedName}"`);
    } catch (error) {
      toast.error('Error al reasignar entradas: ' + (error as Error).message);
    }
  }, [entries, updateEntry]);

  return {
    proposalModalOpen,
    setProposalModalOpen,
    proposals,
    handleAcceptProposal,
  };
}
