import { v4 as uuidv4 } from 'uuid';
import type { StorageStrategy } from '@/lib/storage/StorageStrategy';
import type { TimeEntry, TimerState, Proceso } from '../types';

function formatTimeHHMM(date: Date): string {
  return date.toTimeString().slice(0, 5); // HH:MM
}

function calculateDurationSeconds(startTime: string, endTime: string): number {
   const toMinutes = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };
  return (toMinutes(endTime)  - toMinutes(startTime)) * 60;
}

export interface StopTimerResult {
  start: Date;
  end: Date;
  taskId: number;
  taskName: string;
}

/**
 * Servicio de lógica de negocio para el TimeTracker.
 * Maneja CRUD de registros, control del temporizador y sincronización.
 */
export class TimeTrackingService {
  constructor(private storage: StorageStrategy) {}

  /**
   * Crea un nuevo registro de tiempo.
   */
  async createEntry(data: {
    taskId: number;
    taskName: string;
    date: string;
    startTime: string;
    endTime: string;
    description?: string;
    recoverable?: boolean;
  }): Promise<TimeEntry> {
    const now = new Date().toISOString();
    const durationInSecond = calculateDurationSeconds(data.startTime, data.endTime);
    const proceso: Proceso = { proceso: data.taskId, nombre: data.taskName };

    const entry: TimeEntry = {
      id: uuidv4(),
      taskId: data.taskId,
      taskName: data.taskName,
      proceso,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      duration: durationInSecond ,
      description: data.description,
      recoverable: data.recoverable,
      createdAt: now,
      updatedAt: now,
      synced: false
    };

    await this.storage.saveEntry(entry);
    return entry;
  }

  /**
   * Actualiza un registro existente.
   */
  async updateEntry(id: string, data: Partial<TimeEntry>): Promise<TimeEntry | null> {
    const existing = await this.storage.getEntry(id);
    if (!existing) return null;

    const updated: TimeEntry = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString()
    };

    // Recalcular duración si cambiaron los tiempos
    if (data.startTime || data.endTime) {
      updated.duration = calculateDurationSeconds(
        data.startTime || existing.startTime,
        data.endTime || existing.endTime
      );
    }

    await this.storage.updateEntry(updated);
    return updated;
  }

  /**
   * Elimina un registro.
   */
  async deleteEntry(id: string): Promise<void> {
    await this.storage.deleteEntry(id);
  }

  /**
   * Obtiene todos los registros, opcionalmente filtrados por rango de fechas.
   */
  async getEntries(startDate?: string, endDate?: string): Promise<TimeEntry[]> {
    if (startDate && endDate) {
      return this.storage.getEntriesByDateRange(startDate, endDate);
    }
    return this.storage.getAllEntries();
  }

  /**
   * Obtiene un registro por ID.
   */
  async getEntry(id: string): Promise<TimeEntry | null> {
    return this.storage.getEntry(id);
  }

  /**
   * Inicia el temporizador para una tarea.
   */
  async startTimer(taskId: number, taskName: string, description?: string): Promise<TimerState> {
    const state: TimerState = {
      isRunning: true,
      taskId,
      taskName,
      startTime: new Date().toISOString(),
      elapsed: 0,
      description
    };
    await this.storage.saveTimerState(state);
    return state;
  }

  /**
   * Detiene el temporizador y opcionalmente crea un registro de tiempo.
   * @param options.persist Si es false, retorna start/end sin crear entrada. Default: true.
   * @returns TimeEntry creado, StopTimerResult si persist=false, o null si no había temporizador.
   */
  async stopTimer(options?: { persist?: boolean }): Promise<TimeEntry | StopTimerResult | null> {
    const state = await this.storage.getTimerState();
    if (!state || !state.isRunning) return null;

    const start = new Date(state.startTime);
    const end = new Date();
    const persist = options?.persist ?? true;

    if (!persist) {
      await this.storage.clearTimerState();
      return { start, end, taskId: state.taskId, taskName: state.taskName };
    }

    // Calcular duración real desde el inicio
    const durationSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);

    const entry = await this.createEntry({
      taskId: state.taskId,
      taskName: state.taskName,
      date: start.toISOString().split('T')[0],
      startTime: formatTimeHHMM(start),
      endTime: formatTimeHHMM(end),
      description: state.description
    });

    // Actualizar la duración con el cálculo real
    const updatedEntry = await this.updateEntry(entry.id, {
      duration: durationSeconds
    });

    await this.storage.clearTimerState();
    return updatedEntry || entry;
  }

  /**
   * Recupera el estado del temporizador al abrir la aplicación.
   * Calcula el tiempo transcurrido desde que se inició.
   */
  async recoverTimerState(): Promise<TimerState | null> {
    const state = await this.storage.getTimerState();
    if (!state || !state.isRunning) return null;

    // Calcular tiempo transcurrido desde startTime
    const elapsed = Math.floor(
      (Date.now() - new Date(state.startTime).getTime()) / 1000
    );

    return { ...state, elapsed };
  }

  /**
   * Obtiene el estado actual del temporizador sin recuperación.
   */
  async getTimerState(): Promise<TimerState | null> {
    return this.storage.getTimerState();
  }

  /**
   * Actualiza la hora de inicio del temporizador en ejecución.
   * Recalcula elapsed y persiste en IndexedDB.
   * @returns El nuevo valor de elapsed en segundos.
   */
  async updateTimerStartTime(newStartTime: string): Promise<number> {
    const state = await this.storage.getTimerState();
    if (!state || !state.isRunning) return 0;

    // Clampear si es futuro
    const newStart = new Date(newStartTime);
    const now = new Date();
    if (newStart.getTime() > now.getTime()) {
      newStartTime = now.toISOString();
    }

    // No-op si el tiempo no cambió (comparar hasta minutos, ignorar milisegundos)
    if (newStartTime.slice(0, 16) === state.startTime.slice(0, 16)) {
      return state.elapsed;
    }

    // Recalcular elapsed
    const elapsed = Math.floor(
      (Date.now() - new Date(newStartTime).getTime()) / 1000
    );

    const updated: TimerState = {
      ...state,
      startTime: newStartTime,
      elapsed
    };

    await this.storage.saveTimerState(updated);
    return elapsed;
  }

  /**
   * Actualiza la descripción del temporizador en ejecución.
   * Persiste en IndexedDB para que sobreviva navegación.
   */
  async updateTimerDescription(description: string): Promise<void> {
    const state = await this.storage.getTimerState();
    if (!state || !state.isRunning) return;

    const updated: TimerState = {
      ...state,
      description
    };

    await this.storage.saveTimerState(updated);
  }

  /**
   * Cancela el temporizador sin crear un registro.
   */
  async cancelTimer(): Promise<void> {
    await this.storage.clearTimerState();
  }
}

// Instancia por defecto con IndexedDB
import { indexedDBStorage } from '@/lib/storage/IndexedDBStorage';
export const timeTrackingService = new TimeTrackingService(indexedDBStorage);