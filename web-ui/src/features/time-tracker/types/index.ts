export interface Proceso {
  proceso: number;
  nombre: string;
  /** ID de la fase a la que pertenece el proceso */
  faseId?: number;
  /** Nombre de la fase a la que pertenece el proceso */
  faseNombre?: string;
  /** ID del proyecto al que pertenece el proceso (número real, o CodCli string para procesos pendientes) */
  proyectoId?: number | string;
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
  /** true si es un Proceso Pendiente (ID provisional local) */
  esPendiente?: boolean;
  /** true si pertenece a un Proyecto Offline marcado */
  esProyectoOffline?: boolean;
  /** ID provisional del registro de Proceso Pendiente (cuando esPendiente) */
  procesoPendienteId?: number;
}

/**
 * Proceso Pendiente: proceso creado offline con un ID provisional local
 * (entero negativo, p.ej. -1, -2...) que el backend asignará al sincronizar.
 */
export interface ProcesoPendiente {
  /** ID provisional local (entero negativo, p.ej. -1, -2...) */
  id: number;
  nombre: string;
  faseId?: number;
  faseNombre?: string;
  /** CodCli del proyecto */
  proyectoId?: string;
  proyectoNombre?: string;
  clienteId?: string;
  clienteNombre?: string;
  minutos: number;
  /** YYYY-MM-DD */
  fechaInicio?: string;
  /** YYYY-MM-DD */
  fechaFin?: string;
  /** YYYY-MM-DD */
  fechaEstimacion?: string;
  /** ms */
  createdAt: number;
  /** ms */
  updatedAt: number;
}

/** Estado de sincronización de un Proyecto Offline marcado. */
export type OfflineProjectStatus = 'sincronizado' | 'pendiente';

/**
 * Registro de qué proyectos marcó el usuario como offline y su estado.
 * La caché del árbol del proyecto vive en offlineTree; esto SOLO registra
 * el marcado (y si el proyecto está sincronizado o pendiente de refrescar).
 */
export interface OfflineProjectSelection {
  codCli: string;
  proyecto: string;
  nomProy: string;
  nomCliente: string;
  status: OfflineProjectStatus;
  /** ms */
  markedAt: number;
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
  recoverable?: boolean;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
  syncedAt?: string;
  syncError?: string;
}

export interface LocalWeekDay {
  date: string;           // YYYY-MM-DD
  dateFormatted: string;  // "Lun 2"
  totalSeconds: number;
  entries: TimeEntry[];
}

export interface LocalWeekGroup {
  weekKey: string;              // YYYY-WXX
  weekStart: string;            // YYYY-MM-DD (Monday)
  weekEnd: string;              // YYYY-MM-DD (Sunday)
  weekRangeFormatted: string;   // "2 - 8 Jun"
  totalSeconds: number;
  days: LocalWeekDay[];
}

export interface TimerState {
  isRunning: boolean;
  taskId: number;
  taskName: string;
  startTime: string;
  elapsed: number;
  description?: string;
}