import type { NewEntryInput, TimeEntry } from '../types';
import type { StopTimerResult } from '../services/timeTrackingService';

/** Traduce un Registro existente a los datos de alta que acepta la persistencia. */
export function entryToNewEntryInput(entry: TimeEntry): NewEntryInput {
  return {
    taskId: entry.taskId,
    taskName: entry.taskName,
    date: entry.date,
    startTime: entry.startTime,
    endTime: entry.endTime,
    description: entry.description,
  };
}

/**
 * Traduce el resultado de parar el timer a los datos de un alta, con la descripción
 * pendiente. Devuelve `null` cuando no hay nada que persistir: el timer no corría
 * (`null`) o `stop` ya devolvió el Registro persistido en vez de sus marcas de tiempo.
 */
export function stopResultToNewEntryInput(
  result: TimeEntry | StopTimerResult | null,
  description?: string,
): NewEntryInput | null {
  if (!result || !('start' in result)) return null;
  return {
    taskId: result.taskId,
    taskName: result.taskName,
    date: result.end.toLocaleDateString('sv-SE'),
    startTime: result.start.toTimeString().slice(0, 5),
    endTime: result.end.toTimeString().slice(0, 5),
    description,
  };
}
