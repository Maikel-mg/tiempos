import { useState, useEffect } from 'react';
import type { Proceso } from '../types';
import { indexedDBStorage } from '@/lib/storage/IndexedDBStorage';

/**
 * Hook para obtener la lista de procesos disponibles desde IndexedDB.
 */
export function useTasks() {
  const [tasks, setTasks] = useState<Proceso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const procesos = await indexedDBStorage.getRecentProcesses();
        setTasks(procesos);
      } catch {
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };
    loadTasks();
  }, []);

  return { tasks, loading };
}

/**
 * Hook para cargar procesos con datos de ejemplo (para testing).
 */
export function useTasksWithSampleData() {
  const [tasks] = useState<Proceso[]>([
    { proceso: 1, nombre: 'Desarrollo Feature X' },
    { proceso: 2, nombre: 'Bug Fix Login' },
    { proceso: 3, nombre: 'Reunión Sprint' },
    { proceso: 4, nombre: 'Code Review' },
    { proceso: 5, nombre: 'Documentación API' },
  ]);
  const [loading] = useState(false);

  return { tasks, loading };
}
