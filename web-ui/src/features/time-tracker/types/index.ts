import type { CreateProcessDTO } from '@/features/process-management/types';

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
  /** true si la tarea existe solo en local y todavía no se creó en la BD. */
  pendiente?: boolean;
}

/**
 * Tarea creada sin conexión a la BD. Guarda el DTO exacto que hay que reenviar al
 * SP de alta cuando vuelva la conexión, y usa un `proceso` negativo (que no puede
 * colisionar con un id real) como `taskId` de los Registros que la usan.
 */
export interface LocalProcess {
  proceso: number;
  nombre: string;
  dto: CreateProcessDTO;
  creadoEn: string;
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

/** Datos que la capa de persistencia acepta para dar de alta un Registro de tiempo. */
export interface NewEntryInput {
  taskId: number;
  taskName: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
}

/** Pestaña activa de la lista de Registros: tabla o agrupado por tarea. */
export type EntryViewTab = 'table' | 'grouped';

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
/** Resumen de horas registradas para una tarea (proceso). */
export interface TaskHourSummary {
  taskId: number;
  taskName: string;
  totalSeconds: number;
  entryCount: number;
  entries: TimeEntry[];
}

/** Resultado de agrupar Registros de tiempo por tarea. */
export interface TaskHoursResult {
  byTaskId: Map<number, TaskHourSummary>;
  /** Grupos ordenados de mayor a menor totalSeconds (empate: taskId ascendente). */
  sorted: TaskHourSummary[];
  grandTotalSeconds: number;
}
