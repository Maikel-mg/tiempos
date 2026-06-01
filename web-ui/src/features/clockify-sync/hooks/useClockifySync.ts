import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { retry } from '@/lib/retry';
import type { TaskProposal } from '@/domain/proposals/extract-proposals';
import type { SyncResult, SyncProgress, CreateTaskResponse, BulkUpdateEntriesResponse } from '../types';

interface UseClockifySyncOptions {
  /** Called after a successful sync so the UI can refresh */
  onSuccess?: () => void;
}

interface UseClockifySyncReturn {
  /** Current sync progress */
  progress: SyncProgress;
  /** Whether the confirmation dialog is open */
  dialogOpen: boolean;
  /** The proposal currently pending confirmation (or null) */
  pendingProposal: TaskProposal | null;
  /** Open the confirmation dialog for a proposal */
  requestSync: (proposal: TaskProposal) => void;
  /** Close the confirmation dialog without syncing */
  cancelSync: () => void;
  /** Confirm and execute the sync */
  confirmSync: () => Promise<SyncResult | void>;
}

/**
 * Orchestrates the two-step Clockify sync:
 *  1. Create task in Clockify
 *  2. Bulk-reassign time entries to the new task
 *
 * Both steps use the generic `retry` utility with exponential backoff.
 */
export function useClockifySync(options: UseClockifySyncOptions = {}): UseClockifySyncReturn {
  const { onSuccess } = options;

  const [progress, setProgress] = useState<SyncProgress>({ step: 'idle', isSyncing: false });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingProposal, setPendingProposal] = useState<TaskProposal | null>(null);

  const requestSync = useCallback((proposal: TaskProposal) => {
    setPendingProposal(proposal);
    setDialogOpen(true);
  }, []);

  const cancelSync = useCallback(() => {
    setDialogOpen(false);
    setPendingProposal(null);
    setProgress({ step: 'idle', isSyncing: false });
  }, []);

  const confirmSync = useCallback(async () => {
    if (!pendingProposal) return;

    setProgress({ step: 'creating-task', isSyncing: true });

    try {
      // Step 1: Create task in Clockify
      const taskResult = await retry(
        async () => {
          const result = await apiClient.post<CreateTaskResponse>('/clockify/create-task', {
            name: pendingProposal.proposedName,
            projectId: pendingProposal.clockifyProjectId,
          });
          if (!result.success) throw new Error(result.message);
          return result.data;
        },
        {
          maxAttempts: 3,
          onRetry: (attempt) => {
            toast.info(`Reintentando creación de tarea... (intento ${attempt})`);
          },
        },
      );

      if (!taskResult.success) {
        throw new Error(taskResult.message);
      }

      // Step 2: Bulk-reassign entries
      setProgress({ step: 'reassigning-entries', isSyncing: true });

      const reassignResult = await retry(
        async () => {
          const result = await apiClient.put<BulkUpdateEntriesResponse>('/clockify/bulk-update-entries', {
            entries: pendingProposal.entries,
            taskId: taskResult.taskId,
          });
          if (!result.success) throw new Error(result.message);
          return result.data;
        },
        {
          maxAttempts: 3,
          onRetry: (attempt) => {
            toast.info(`Reintentando reasignación de entradas... (intento ${attempt})`);
          },
        },
      );

      if (!reassignResult.success) {
        throw new Error(reassignResult.message);
      }

      // Success
      const syncResult: SyncResult = {
        taskCreated: { success: true, message: 'Tarea creada', data: taskResult },
        entriesReassigned: { success: true, message: `${reassignResult.updated} entradas reasignadas`, data: reassignResult },
        success: true,
      };

      toast.success('Sincronización completa', {
        description: `Tarea "${pendingProposal.proposedName}" creada y ${reassignResult.updated} entradas reasignadas.`,
      });

      setProgress({ step: 'done', isSyncing: false });
      setDialogOpen(false);
      setPendingProposal(null);

      onSuccess?.();

      return syncResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido';

      toast.error('Error en la sincronización', {
        description: message,
        action: {
          label: 'Reintentar',
          onClick: () => confirmSync(),
        },
      });

      setProgress({ step: 'error', isSyncing: false });
      throw err;
    }
  }, [pendingProposal, onSuccess]);

  return {
    progress,
    dialogOpen,
    pendingProposal,
    requestSync,
    cancelSync,
    confirmSync,
  };
}
