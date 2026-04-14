export interface TimeEntry {
  id: string;
  taskId: string;
  taskName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  duration: number; // seconds
  description?: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  synced: boolean;
  syncedAt?: string; // ISO timestamp
}

export interface TimerState {
  isRunning: boolean;
  taskId: string;
  taskName: string;
  startTime: string; // ISO timestamp
  elapsed: number; // seconds accumulated
}

export interface Task {
  id: string;
  name: string;
  processId?: string;
}