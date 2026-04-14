import { useState, useEffect } from 'react';
import type { Task } from '../types';

/**
 * Hook para obtener la lista de tareas/procesos disponibles.
 * Por el momento devuelve una lista vacía - se puede extender para cargar
 * desde el sistema de process-management o desde una API.
 */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Por ahora devolvemos una lista vacía
    // TODO: Extender para cargar desde process-management cuando esté disponible
    const loadTasks = async () => {
      // Simular carga
      await new Promise(resolve => setTimeout(resolve, 100));
      setTasks([]);
      setLoading(false);
    };
    loadTasks();
  }, []);

  return { tasks, loading };
}

/**
 * Hook para cargar tareas con datos de ejemplo (para testing).
 * En producción, esto vendría del sistema de process-management.
 */
export function useTasksWithSampleData() {
  const [tasks] = useState<Task[]>([
    { id: '1', name: 'Desarrollo Feature X', processId: '100' },
    { id: '2', name: 'Bug Fix Login', processId: '101' },
    { id: '3', name: 'Reunión Sprint', processId: '102' },
    { id: '4', name: 'Code Review', processId: '103' },
    { id: '5', name: 'Documentación API', processId: '104' },
  ]);
  const [loading] = useState(false);

  return { tasks, loading };
}