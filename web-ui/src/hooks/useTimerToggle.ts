import { useCallback } from 'react';
import { toast } from 'sonner';
import { toggleTimer } from '@/features/time-tracker/lib/timerActions';
import { useRunningTimer } from '@/hooks/useRunningTimer';

/**
 * Start/stop the timer from anywhere, with user feedback.
 *
 * Shared by the global shortcut and the command palette so both paths behave
 * identically. Exposes the running state so callers can label the action.
 */
export function useTimerToggle() {
  const { isRunning, taskName } = useRunningTimer();

  const toggle = useCallback(async () => {
    try {
      const result = await toggleTimer();
      switch (result.action) {
        case 'started':
          toast.success(`Timer iniciado: ${result.taskName}`);
          break;
        case 'stopped':
          toast.success(`Timer detenido: ${result.taskName}`);
          break;
        case 'no-previous-task':
          toast.info('No hay una tarea previa para continuar. Elegí una en Mi TimeTracker.');
          break;
        case 'blocked-midnight':
          toast.warning('El timer cruzó medianoche. Resolvé el corte en Mi TimeTracker.');
          break;
      }
    } catch (error) {
      console.error('Error toggling timer:', error);
      toast.error('No se pudo cambiar el estado del timer.');
    }
  }, []);

  return { isRunning, taskName, toggle };
}
