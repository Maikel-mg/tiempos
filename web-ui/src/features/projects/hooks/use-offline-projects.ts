import { useCallback, useEffect, useState } from 'react';
import { wizardConfig } from '@/config/stores';
import { processOfflineService } from '@/features/time-tracker/services/ProcessOfflineService';
import type { OfflineProjectSelection } from '@/features/time-tracker/types';
import type { Project } from '../types';

function selectionKey(codCli: string, proyecto: string): string {
  return `${codCli}-${proyecto}`;
}

function getUsured(): string {
  return wizardConfig.get()?.usuario ?? '';
}

/**
 * Manages the "disponible offline" state of the projects for the current
 * usuario (wizardConfig.usuario). Encapsulates loading the offline selections,
 * marking/unmarking projects and the per-row in-flight state used by the UI
 * spinner.
 *
 * Marking flow: markProjectOffline leaves the project as 'pendiente', then the
 * project tree is refreshed to cache its phases/tasks; if that refresh succeeds
 * the project transitions to 'sincronizado', otherwise it stays 'pendiente'.
 */
export function useOfflineProjects() {
  const [usuario, setUsuario] = useState<string>(getUsured);
  const [selections, setSelections] = useState<OfflineProjectSelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingKeys, setMarkingKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsubscribe = wizardConfig.subscribe((config) => {
      setUsuario(config.usuario ?? '');
    });
    return unsubscribe;
  }, []);

  const loadSelections = useCallback(async () => {
    const usured = getUsured();
    if (!usured) {
      setSelections([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await processOfflineService.getOfflineProjectSelections(usured);
      setSelections(data);
    } catch {
      setSelections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSelections();
  }, [loadSelections]);

  const refresh = useCallback(() => loadSelections(), [loadSelections]);

  const markProject = useCallback(
    async (project: Project) => {
      const usured = getUsured();
      if (!usured) return;
      const key = selectionKey(project.CodCli, project.Proyecto);
      setMarkingKeys((prev) => ({ ...prev, [key]: true }));
      try {
        await processOfflineService.markProjectOffline(usured, {
          codCli: project.CodCli,
          proyecto: project.Proyecto,
          nomProy: project.NomProy,
          nomCliente: project.NomCliente,
        });
        // Refresh the tree to cache phases/tasks. If it works the project is
        // 'sincronizado'; if it fails (offline) it stays 'pendiente'.
        try {
          await processOfflineService.getProjectTree(usured, project.CodCli, project.Proyecto, {
            refresh: true,
          });
          await processOfflineService.setOfflineProjectStatus(
            usured,
            project.CodCli,
            project.Proyecto,
            'sincronizado'
          );
        } catch {
          // Sin conexión o error del backend: el proyecto queda 'pendiente'.
        }
        await loadSelections();
      } finally {
        setMarkingKeys((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [loadSelections]
  );

  const removeProject = useCallback(
    async (project: Project) => {
      const usured = getUsured();
      if (!usured) return;
      const key = selectionKey(project.CodCli, project.Proyecto);
      setMarkingKeys((prev) => ({ ...prev, [key]: true }));
      try {
        // Punto de extensión T5: bloquear aquí el desmarcado si el proyecto
        // tiene entradas de tiempo pendientes de sincronizar. Por ahora se
        // permite siempre.
        await processOfflineService.removeProjectOffline(usured, project.CodCli, project.Proyecto);
        await loadSelections();
      } finally {
        setMarkingKeys((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [loadSelections]
  );

  const isMarking = useCallback(
    (codCli: string, proyecto: string) => Boolean(markingKeys[selectionKey(codCli, proyecto)]),
    [markingKeys]
  );

  const getSelection = useCallback(
    (codCli: string, proyecto: string): OfflineProjectSelection | undefined =>
      selections.find((s) => s.codCli === codCli && s.proyecto === proyecto),
    [selections]
  );

  return {
    selections,
    loading,
    usuarioConfigured: usuario.length > 0,
    markProject,
    removeProject,
    refresh,
    marking: markingKeys,
    isMarking,
    getSelection,
  };
}
