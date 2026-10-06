import { useMemo, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { Database, Table, LayoutGrid, Pencil, Trash2, Copy, Play, RefreshCw, Split } from 'lucide-react';
import { toast } from 'sonner';
import { useCommandActions, type CommandAction } from '@/components/CommandActionsContext';
import { splitAffordance } from '../lib/splitEntry';
import type { TimeEntry } from '../types';
import type { StopTimerResult } from '../services/timeTrackingService';

/** Lo que la acción de detener el timer necesita del Timer activo. */
export interface CommandTimerPort {
  isRunning: boolean;
  stop: (options?: { persist?: boolean }) => Promise<TimeEntry | StopTimerResult | null>;
}

/** Datos con los que la acción de detener el timer persiste la entrada. */
export interface CommandCreateEntryInput {
  taskId: number;
  taskName: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
}

export interface UseTimeTrackerCommandActionsParams {
  pendingEntries: TimeEntry[];
  handlePlayEntry: (entry: TimeEntry) => void;
  timer: CommandTimerPort;
  createEntry: (data: CommandCreateEntryInput) => Promise<unknown>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeItem: TimeEntry | null;
  handleEditEntry: (entry: TimeEntry) => void;
  handleDeleteEntry: (id: string) => void;
  handleDuplicateEntry: (entry: TimeEntry) => void;
  handleSyncEntry: (entry: TimeEntry) => void;
  handleSplitEntry: (entry: TimeEntry) => void;
  handleSplitTimer: () => void;
  liveTimerEntry: TimeEntry | null;
  timerSplitDisabledReason: string | undefined;
  openCreate: () => void;
  setSyncPanelOpen: Dispatch<SetStateAction<boolean>>;
  pendingDescription: MutableRefObject<string | undefined>;
}

/**
 * Acciones contextuales del time tracker para el command palette: las construye a
 * partir del estado y los handlers de la página y las registra bajo `time-tracker`.
 *
 * Sólo orquesta; el comportamiento (etiquetas, disponibilidad y efecto de cada
 * acción) es el mismo que tenía la página.
 */
export function useTimeTrackerCommandActions({
  pendingEntries,
  handlePlayEntry,
  timer,
  createEntry,
  activeTab,
  setActiveTab,
  activeItem,
  handleEditEntry,
  handleDeleteEntry,
  handleDuplicateEntry,
  handleSyncEntry,
  handleSplitEntry,
  handleSplitTimer,
  liveTimerEntry,
  timerSplitDisabledReason,
  openCreate,
  setSyncPanelOpen,
  pendingDescription,
}: UseTimeTrackerCommandActionsParams): CommandAction[] {
  const commandActions = useMemo(() => [
    // ── Row-level actions (active row) ────────────────────────────
    {
      id: 'row-edit',
      label: `Editar${activeItem ? `: ${activeItem.taskName}` : ''}`,
      icon: <Pencil className="h-4 w-4" />,
      action: () => activeItem && handleEditEntry(activeItem),
      when: () => !!activeItem,
      group: 'Registro activo',
    },
    {
      id: 'row-delete',
      label: `Eliminar${activeItem ? `: ${activeItem.taskName}` : ''}`,
      icon: <Trash2 className="h-4 w-4" />,
      action: () => activeItem && handleDeleteEntry(activeItem.id),
      when: () => !!activeItem,
      group: 'Registro activo',
    },
    {
      id: 'row-duplicate',
      label: `Duplicar${activeItem ? `: ${activeItem.taskName}` : ''}`,
      icon: <Copy className="h-4 w-4" />,
      action: () => activeItem && handleDuplicateEntry(activeItem),
      when: () => !!activeItem,
      group: 'Registro activo',
    },
    {
      id: 'row-split',
      label: `Dividir${activeItem ? `: ${activeItem.taskName}` : ''}`,
      icon: <Split className="h-4 w-4" />,
      action: () => activeItem && handleSplitEntry(activeItem),
      when: () => {
        if (!activeItem) return false;
        const affordance = splitAffordance(activeItem);
        return affordance.visible && affordance.enabled;
      },
      group: 'Registro activo',
    },
    {
      id: 'split-running-timer',
      label: 'Dividir el timer en curso',
      icon: <Split className="h-4 w-4" />,
      action: () => handleSplitTimer(),
      when: () => !!liveTimerEntry && !timerSplitDisabledReason,
      group: 'TimeTracker',
    },
    {
      id: 'row-play',
      label: `Reproducir${activeItem ? `: ${activeItem.taskName}` : ''}`,
      icon: <Play className="h-4 w-4" />,
      action: () => activeItem && handlePlayEntry(activeItem),
      when: () => !!activeItem && !timer.isRunning,
      group: 'Registro activo',
    },
    {
      id: 'row-sync',
      label: `Sincronizar${activeItem ? `: ${activeItem.taskName}` : ''}`,
      icon: <RefreshCw className="h-4 w-4" />,
      action: () => activeItem && handleSyncEntry(activeItem),
      when: () => !!activeItem && !activeItem.synced,
      group: 'Registro activo',
    },
    {
      id: 'start-timer',
      label: 'Iniciar timer',
      icon: <span className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polygon points="6 3 20 12 6 21 6 3"/></svg></span>,
      action: () => {
        // Start timer with the first pending entry or show a message
        if (pendingEntries.length > 0) {
          const entry = pendingEntries[0];
          handlePlayEntry(entry);
        } else {
          toast.info('No hay entradas para iniciar');
        }
      },
      when: () => !timer.isRunning,
      group: 'TimeTracker',
    },
    {
      id: 'stop-timer',
      label: 'Detener timer',
      icon: <span className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect x="6" y="6" width="12" height="12" rx="2"/></svg></span>,
      action: () => {
        timer.stop({ persist: true }).then((result) => {
          if (result && 'start' in result) {
            createEntry({
              taskId: result.taskId,
              taskName: result.taskName,
              date: result.end.toLocaleDateString('sv-SE'),
              startTime: result.start.toTimeString().slice(0, 5),
              endTime: result.end.toTimeString().slice(0, 5),
              description: pendingDescription.current,
            });
            toast.success('Timer detenido y guardado');
          }
        });
      },
      when: () => timer.isRunning,
      group: 'TimeTracker',
    },
    {
      id: 'sync-entries',
      label: 'Sincronizar entradas con BD',
      icon: <Database className="h-4 w-4" />,
      action: () => setSyncPanelOpen(true),
      group: 'TimeTracker',
    },
    {
      id: 'manual-entry',
      label: 'Crear entrada manual',
      icon: <span className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></span>,
      action: () => openCreate(),
      group: 'TimeTracker',
    },
    {
      id: 'switch-table',
      label: 'Cambiar a vista tabla',
      icon: <Table className="h-4 w-4" />,
      action: () => setActiveTab('table'),
      when: () => activeTab !== 'table',
      group: 'TimeTracker',
    },
    {
      id: 'switch-grouped',
      label: 'Cambiar a vista agrupado',
      icon: <LayoutGrid className="h-4 w-4" />,
      action: () => setActiveTab('grouped'),
      when: () => activeTab !== 'grouped',
      group: 'TimeTracker',
    },
  ], [pendingEntries, handlePlayEntry, timer.isRunning, timer.stop, createEntry, activeTab, activeItem, handleEditEntry, handleDeleteEntry, handleDuplicateEntry, handleSyncEntry, openCreate]);

  useCommandActions('time-tracker', commandActions);

  return commandActions;
}
