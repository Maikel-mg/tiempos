import { useCallback } from 'react';
import { useTimeEntries } from './useTimeEntries';
import { useEntrySelection } from './useEntrySelection';
import { useEntryEditor } from './useEntryEditor';
import { useSplitFlow } from './useSplitFlow';
import { useEntrySync } from './useEntrySync';
import { useTimer } from './useTimer';
import type { TimeEntry } from '../types';

/**
 * Sesión de registro de tiempos: la composición de datos y acciones que comparte
 * toda pantalla que registre tiempos sobre Registros de tiempo y el Timer activo.
 *
 * Primera mitad de la sesión: Registros de tiempo con su CRUD, la selección de
 * filas, el editor (abrir, alta, duplicar, eliminar) y el Timer activo. No conoce
 * el período visible —eso es de cada pantalla—, así que la vista del Timer se
 * compone aparte (`useTimerView`) y sus flujos en `useTimeTrackingFlows`.
 */
export function useTimeTrackingSession() {
  const data = useTimeEntries();
  const selection = useEntrySelection();

  const editor = useEntryEditor({
    entries: data.entries,
    createEntry: data.createEntry,
    updateEntry: data.updateEntry,
    deleteEntry: data.deleteEntry,
    onEntryDeleted: selection.handleEntryDeleted,
  });

  const timer = useTimer();

  return { ...data, selection, editor, timer };
}

export type TimeTrackingSession = ReturnType<typeof useTimeTrackingSession>;

export interface UseTimeTrackingFlowsParams {
  /** Registro virtual del Timer activo; lo aporta `useTimerView` de cada pantalla. */
  liveTimerEntry: TimeEntry | null;
}

/**
 * Segunda mitad de la sesión: los flujos que necesitan saber si hay un Timer
 * activo —división de un Registro de tiempo y del propio Timer— y la
 * sincronización contra SQL Server, que a su vez limpia el deshacer de una
 * división ya sincronizada.
 */
export function useTimeTrackingFlows(
  session: TimeTrackingSession,
  { liveTimerEntry }: UseTimeTrackingFlowsParams,
) {
  const { selectedIds, setSelectedIds } = session.selection;

  const split = useSplitFlow({
    splitEntry: session.splitEntry,
    splitRunningTimer: session.splitRunningTimer,
    deleteEntry: session.deleteEntry,
    updateEntry: session.updateEntry,
    timer: session.timer,
    liveTimerEntry,
    selectedIds,
    setSelectedIds,
  });

  const sync = useEntrySync({
    entries: session.entries,
    selectedIds,
    markSynced: session.markSynced,
    onEntriesSynced: split.invalidateSplitUndo,
  });

  /** Sincroniza en bloque: selecciona esos Registros de tiempo y abre el panel. */
  const syncMany = useCallback(
    (ids: string[]) => {
      setSelectedIds(new Set(ids));
      sync.setSyncPanelOpen(true);
    },
    [setSelectedIds, sync.setSyncPanelOpen],
  );

  return { split, sync, syncMany };
}
