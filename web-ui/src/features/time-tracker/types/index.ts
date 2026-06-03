export interface Proceso {
  proceso: number;
  nombre: string;
  /** Nombre de la fase a la que pertenece el proceso */
  faseNombre?: string;
  /** Nombre del proyecto al que pertenece el proceso */
  proyectoNombre?: string;
  /** Nombre del cliente al que pertenece el proyecto */
  clienteNombre?: string;
}

export interface TimeEntry {
  id: string;
  taskId: number;
  taskName: string;
  serverId?: number;
  proceso: Proceso;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
  syncedAt?: string;
  syncError?: string;
}

export interface TimerState {
  isRunning: boolean;
  taskId: number;
  taskName: string;
  startTime: string;
  elapsed: number;
}