import { useState, useEffect, useCallback } from 'react';
import { TimeTrackingService } from '../services/timeTrackingService';
import { indexedDBStorage } from '@/lib/storage/IndexedDBStorage';
import type { TimeEntry } from '../types';

// Instancia del servicio
const service = new TimeTrackingService(indexedDBStorage);

/**
 * Hook para manejar CRUD de registros de tiempo.
 */
export function useTimeEntries() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar todos los registros al montar
  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await service.getEntries();
      // Ordenar por fecha descendente
      setEntries(data.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  /**
   * Crea un nuevo registro de tiempo.
   */
  const createEntry = useCallback(async (
    data: {
      taskId: number;
      taskName: string;
      date: string;
      startTime: string;
      endTime: string;
      description?: string;
    }
  ): Promise<TimeEntry> => {
    const entry = await service.createEntry(data);
    setEntries((prev) => [entry, ...prev]);
    return entry;
  }, []);

  /**
   * Actualiza un registro existente.
   */
  const updateEntry = useCallback(async (
    id: string,
    data: Partial<TimeEntry>
  ): Promise<TimeEntry | null> => {
    const updated = await service.updateEntry(id, data);
    if (updated) {
      setEntries((prev) => prev.map((e) => (e.id === id ? updated : e)));
    }
    return updated;
  }, []);

  /**
   * Elimina un registro.
   */
  const deleteEntry = useCallback(async (id: string): Promise<void> => {
    await service.deleteEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  /**
   * Marca registros como sincronizados.
   */
  const markSynced = useCallback(async (ids: string[]): Promise<void> => {
    const syncedAt = new Date().toISOString();
    await indexedDBStorage.markAsSynced(ids, syncedAt);
    setEntries((prev) =>
      prev.map((e) => (ids.includes(e.id) ? { ...e, synced: true, syncedAt } : e))
    );
  }, []);

  /**
   * Obtiene entradas filtradas por rango de fechas.
   */
  const getEntriesByDateRange = useCallback(async (
    startDate: string,
    endDate: string
  ): Promise<TimeEntry[]> => {
    return service.getEntries(startDate, endDate);
  }, []);

  return {
    entries,
    loading,
    createEntry,
    updateEntry,
    deleteEntry,
    markSynced,
    refresh: loadEntries,
    getEntriesByDateRange
  };
}