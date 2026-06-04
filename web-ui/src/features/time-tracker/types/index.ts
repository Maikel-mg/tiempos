export interface Proceso {
  proceso: number;
  nombre: string;
  /** ID de la fase a la que pertenece el proceso */
  faseId?: number;
  /** Nombre de la fase a la que pertenece el proceso */
  faseNombre?: string;
  /** ID del proyecto al que pertenece el proceso */
  proyectoId?: number;
  /** Nombre del proyecto al que pertenece el proceso */
  proyectoNombre?: string;
  /** ID del cliente al que pertenece el proyecto */
  clienteId?: string;
  /** Nombre del cliente al que pertenece el proyecto */
  clienteNombre?: string;
  /** ID del departamento */
  departamentoId?: number;
  /** Nombre del departamento */
  departamentoNombre?: string;
  /** ID de la disciplina */
  disciplinaId?: number;
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