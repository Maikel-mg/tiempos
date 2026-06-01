import type { TaskProposal } from '@/domain/proposals/extract-proposals';

/** Result of a single step in the sync process */
export interface SyncStepResult {
  success: boolean;
  message: string;
  data?: unknown;
}

/** Overall result of a sync operation */
export interface SyncResult {
  taskCreated: SyncStepResult;
  entriesReassigned: SyncStepResult;
  success: boolean;
}

/** Progress state exposed by the sync hook */
export interface SyncProgress {
  step: 'idle' | 'creating-task' | 'reassigning-entries' | 'done' | 'error';
  isSyncing: boolean;
}

/** Parameters needed to execute a sync */
export interface SyncParams {
  proposal: TaskProposal;
}

/** Backend response for task creation */
export interface CreateTaskResponse {
  success: boolean;
  taskId?: string;
  message: string;
}

/** Backend response for bulk entry update */
export interface BulkUpdateEntriesResponse {
  success: boolean;
  updated: number;
  message: string;
}
