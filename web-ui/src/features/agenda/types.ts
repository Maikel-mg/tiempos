import type { Proceso, TimeEntry } from '@/features/time-tracker/types';
import type { PlanMode } from './lib/planRange';

/** Vistas del plan: la misma información del período, tres lecturas distintas. */
export type AgendaViewKind = 'calendar' | 'agenda' | 'timeline';

/** Datos mínimos para dar de alta un Registro de tiempo desde el plan. */
export interface EntryDraft {
  taskId: number;
  taskName: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
}

/** Hueco de tiempo pulsado: el compositor se rellena con estas horas. */
export interface ComposerSlot {
  date: string;
  startTime: string;
  endTime: string;
  /** Tarea ya elegida cuando el alta viene de una fila del Timeline. */
  preset?: Proceso;
}

/** Acciones disponibles sobre un Registro de tiempo, iguales que en la tabla. */
export interface EntryActions {
  onEdit?: (entry: TimeEntry) => void;
  onPlay?: (entry: TimeEntry) => void;
  onDuplicate?: (entry: TimeEntry) => void;
  onSplit?: (entry: TimeEntry) => void;
  onSync?: (entry: TimeEntry) => void;
  onDelete?: (id: string) => void;
}

/**
 * Lo que comparten las tres vistas del plan: el período ya recortado a sus días
 * laborables, la Hora de entrada para el eje y las marcas de Timer activo y de
 * entrada resaltada.
 */
export interface PlanViewProps {
  entries: TimeEntry[];
  days: string[];
  mode: PlanMode;
  /** Hora de entrada de la jornada, en minutos desde medianoche. */
  workdayStart: number | null;
  /** Registro virtual del Timer activo: bloque vivo, nunca editable. */
  timerEntryId?: string;
  /** Registro de tiempo resaltado por la navegación de teclado. */
  activeEntryId?: string;
  actions?: EntryActions;
  onPickDay?: (day: string) => void;
}
