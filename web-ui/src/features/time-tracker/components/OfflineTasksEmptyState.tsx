import { Inbox } from 'lucide-react';
import { Link, useInRouterContext } from 'react-router-dom';

export const OFFLINE_TASKS_GUIDANCE =
  'No hay tareas disponibles offline. Conecta y marca tus proyectos en Proyectos';

interface OfflineTasksEmptyStateProps {
  firstExperience?: boolean;
}

export function OfflineTasksEmptyState({ firstExperience = false }: OfflineTasksEmptyStateProps) {
  const inRouter = useInRouterContext();

  return (
    <div
      data-testid="offline-tasks-empty-state"
      className="flex flex-col items-center justify-center text-center space-y-3 p-4"
    >
      <div className="p-3 bg-muted/50 rounded-full">
        <Inbox className="w-8 h-8 text-muted-foreground/70" />
      </div>
      <div>
        <p className="text-sm font-medium" aria-label={OFFLINE_TASKS_GUIDANCE}>
          No hay tareas disponibles offline. Conecta y marca tus proyectos en{' '}
          {inRouter ? (
            <Link to="/projects" className="text-primary underline underline-offset-2">
              Proyectos
            </Link>
          ) : (
            <a href="/projects" className="text-primary underline underline-offset-2">
              Proyectos
            </a>
          )}
        </p>
        {firstExperience && (
          <p data-testid="offline-first-experience" className="text-xs text-muted-foreground mt-2">
            Marca solo los proyectos que necesites para trabajar sin conexión.
          </p>
        )}
      </div>
    </div>
  );
}
