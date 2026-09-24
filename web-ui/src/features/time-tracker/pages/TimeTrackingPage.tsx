import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Database, Table, LayoutGrid, Pencil, Trash2, Copy, Play, RefreshCw, Lightbulb, Split } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PeriodSelector } from '@/components/shared/PeriodSelector';
import { TimeTrackerBar } from '../components/TimeTrackerBar';
import type { TimeTrackerBarHandle } from '../components/TimeTrackerBar';
import { TimeEntryEditorDialog } from '../components/TimeEntryEditorDialog';
import type { TimeEntryFormData } from '../components/TimeEntryEditorDialog';
import { SplitEntryDialog } from '../components/SplitEntryDialog';
import { splitAffordance, splitAvailability, MIN_SPLIT_MINUTES } from '../lib/splitEntry';
import { TimeEntryViewSwitcher } from '../components/TimeEntryViewSwitcher';
import { OverlapAlert } from '../components/OverlapAlert';
import type { OverlapFix } from '../lib/overlaps';
import { SyncPanel } from '../components/SyncPanel';
import { PeriodProgressPanel } from '../components/PeriodProgressPanel';
import { useTimeEntries } from '../hooks/useTimeEntries';
import { useTimer } from '../hooks/useTimer';
import { useCommandActions } from '@/components/CommandActionsContext';
import { useTableKeyboardNavigation } from '@/hooks/useTableKeyboardNavigation';
import { useTableRowShortcuts } from '@/hooks/useTableRowShortcuts';
import { createVirtualTimerEntry } from '../lib/timerVirtualEntry';
import { computePeriodTotal } from '../lib/computePeriodTotal';
import { resolvePeriodRange } from '../lib/periodRange';
import { syncTimeEntries } from '../services/timeEntrySyncService';
import { wizardConfig, dbConfig, proposalConfig } from '@/config/stores';
import { TaskProposalModal } from '@/features/proposal-ui/components/TaskProposalModal';
import { extractProposalsFromLocal } from '@/domain/proposals/extract-local-proposals';
import type { TaskProposal } from '@/domain/proposals/task-proposal';
import type { TimeEntry } from '../types';
import type { PeriodType, DateRange } from '@/components/shared/PeriodSelector';

function formatDurationHMS(totalSeconds: number): string {
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/** Fecha local en `YYYY-MM-DD`, sin pasar por UTC. */
function localDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function TimeTrackingPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [syncPanelOpen, setSyncPanelOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [entryEditorOpen, setEntryEditorOpen] = useState(false);
  const [period, setPeriod] = useState<PeriodType>('week');
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('table');
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  /** Registro que se está dividiendo. */
  const [splittingEntry, setSplittingEntry] = useState<TimeEntry | null>(null);
  /** `true` cuando lo que se divide es el timer en curso y no un Registro guardado. */
  const [splittingTimer, setSplittingTimer] = useState(false);

  const { entries, createEntry, updateEntry, deleteEntry, splitEntry, markSynced } = useTimeEntries();
  const timerHook = useTimer();

  const undoBuffer = useRef<Map<string, TimeEntry>>(new Map());
  const splitUndo = useRef<{
    /** Registro persistido a recortar; `null` si la mitad vive solo en el timer. */
    firstId: string | null;
    /** Mitad nueva persistida; `null` cuando no se persiste (timer en curso). */
    secondId: string | null;
    /**
     * `true` cuando lo que se dividió fue el timer en curso. En ese caso la primera
     * mitad se persistió con un id nuevo y la segunda sigue corriendo: deshacer
     * borra la primera y re-ancla el timer.
     */
    fromTimer: boolean;
    original: TimeEntry;
    timerStartTime?: string;
    /** Se marca cuando alguna de las dos mitades ya se sincronizó: invalida el deshacer. */
    invalidated: boolean;
  } | null>(null);
  const pendingDescription = useRef<string | undefined>(undefined);
  const tableRef = useRef<HTMLTableElement>(null);
  const trackerBarRef = useRef<TimeTrackerBarHandle>(null);

  const pendingEntries = useMemo(
    () => entries.filter((e) => !e.synced),
    [entries]
  );

  const entriesToSync = useMemo(() => {
    if (selectedIds.size === 0) return pendingEntries;
    return pendingEntries.filter((e) => selectedIds.has(e.id));
  }, [pendingEntries, selectedIds]);

  const periodRange = useMemo(
    () => resolvePeriodRange(period, customRange),
    [period, customRange]
  );

  const filteredByPeriod = useMemo(
    () => entries.filter(e => e.date >= periodRange.startStr && e.date <= periodRange.endStr),
    [entries, periodRange]
  );

  const proposals = useMemo(() => {
    // Solo entradas del mes actual
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startDay = start.getFullYear() * 10000 + (start.getMonth() + 1) * 100 + start.getDate();
    const endDay = end.getFullYear() * 10000 + (end.getMonth() + 1) * 100 + end.getDate();

    const monthEntries = entries.filter(e => {
      const d = new Date(e.date + 'T12:00:00');
      const entryDay = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      return entryDay >= startDay && entryDay <= endDay;
    });

    const threshold = proposalConfig.get()?.thresholdHours ?? 8;
    return extractProposalsFromLocal(monthEntries, threshold);
  }, [entries]);

  const todayInRange = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return todayStr >= periodRange.startStr && todayStr <= periodRange.endStr;
  }, [periodRange]);

  const { getRowProps, focusFirst, activeItem } = useTableKeyboardNavigation({
    containerRef: tableRef,
    items: filteredByPeriod,
    getRowId: (entry) => entry.id,
    isEnabled: activeTab === 'table' && !editingEntry,
  });

  const handleDeleteEntry = async (id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;

    await deleteEntry(id);
    const newSelected = new Set(selectedIds);
    newSelected.delete(id);
    setSelectedIds(newSelected);

    if (editingEntry?.id === id) {
      setEditingEntry(null);
    }

    undoBuffer.current.set(id, entry);

    toast('Entrada eliminada', {
      action: {
        label: 'Deshacer',
        onClick: async () => {
          await createEntry({
            taskId: entry.taskId,
            taskName: entry.taskName,
            date: entry.date,
            startTime: entry.startTime,
            endTime: entry.endTime,
            description: entry.description,
          });
          undoBuffer.current.delete(id);
          toast.success('Entrada restaurada');
        },
      },
      onAutoClose: () => {
        undoBuffer.current.delete(id);
      },
    });
  };

  const handleEditEntry = useCallback((entry: TimeEntry) => {
    setEditingEntry(entry);
    setEntryEditorOpen(true);
  }, []);

  const handleSyncEntry = useCallback(async (entry: TimeEntry) => {
    const dbConfigData = dbConfig.get();
    if (!dbConfigData || !dbConfigData.server || !dbConfigData.database) {
      toast.error('Falta configuración de base de datos');
      return;
    }
    const usuario = (() => {
      try {
        const stored = wizardConfig.get();
        return stored?.usuario ?? '';
      } catch { return ''; }
    })();
    const outcome = await syncTimeEntries([entry], dbConfigData, usuario);
    if (outcome.success && outcome.results.some(r => r.success)) {
      const succeededIds = outcome.results.filter(r => r.success).map(r => r.entryId);
      await markSynced(succeededIds);

      // Sincronizar una mitad invalida el deshacer de su división: revertirla
      // dejaría en la base un Registro que ya no existe.
      const undo = splitUndo.current;
      if (undo && succeededIds.some((id) => id === undo.firstId || id === undo.secondId)) {
        undo.invalidated = true;
      }

      toast.success(`Sincronizado: ${entry.taskName}`);
    } else {
      const error = outcome.results[0]?.error ?? 'Error desconocido';
      toast.error(`Error al sincronizar: ${error}`);
    }
  }, [markSynced]);

  const handleApplyOverlapFix = useCallback(async (fix: OverlapFix) => {
    try {
      await updateEntry(fix.entryId, fix.patch);
      toast.success('Solapamiento corregido');
    } catch (error) {
      console.error('Error applying overlap fix:', error);
      toast.error('No se pudo aplicar la corrección');
    }
  }, [updateEntry]);

  const handleDuplicateEntry = useCallback(async (entry: TimeEntry) => {
    await createEntry({
      taskId: entry.taskId,
      taskName: entry.taskName,
      date: entry.date,
      startTime: entry.startTime,
      endTime: entry.endTime,
      description: entry.description,
    });
    toast.success('Entrada duplicada');
  }, [createEntry]);

  const handleSplitEntry = useCallback((entry: TimeEntry) => {
    setSplittingTimer(false);
    setSplittingEntry(entry);
  }, []);

  /**
   * El timer en curso: la fecha y los horarios que se ofrecen son los reales, no
   * los que muestra la fila virtual (que enseña el reloj destripado a la hora).
   */
  const liveTimerEntry = useMemo<TimeEntry | null>(() => {
    const state = timerHook.timerState;
    if (!timerHook.isRunning || !state) return null;

    const start = new Date(state.startTime);
    const end = new Date();
    const date = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;

    return {
      id: 'timer-activo',
      taskId: state.taskId,
      taskName: state.taskName,
      proceso: { proceso: state.taskId, nombre: state.taskName },
      date,
      startTime: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
      endTime: `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`,
      duration: Math.floor((end.getTime() - start.getTime()) / 1000),
      description: state.description,
      createdAt: state.startTime,
      updatedAt: state.startTime,
      synced: false,
    };
  }, [timerHook.isRunning, timerHook.timerState]);

  /**
   * Fecha de hoy mientras la página está montada. Se refresca al volver a la
   * pestaña para que el chequeo de "el timer arrancó hoy" no se quede congelado
   * si la página cruza la medianoche.
   */
  const [todayString, setTodayString] = useState(localDateString);

  useEffect(() => {
    const sync = () => setTodayString(localDateString());
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  const timerSplitDisabledReason = useMemo(() => {
    if (!liveTimerEntry) return undefined;
    if (liveTimerEntry.date !== todayString) {
      return 'El timer cruza la medianoche; al pararlo decidirás cómo dividirlo';
    }
    // Recién arrancado: el timer aún no llega al mínimo de dos minutos.
    if (createVirtualTimerEntry(timerHook.timerState!, new Date()).duration === 0) {
      return `Un Registro de menos de ${MIN_SPLIT_MINUTES} minutos no se puede dividir`;
    }
    const availability = splitAvailability(liveTimerEntry);
    return availability.splittable ? undefined : availability.reason;
  }, [liveTimerEntry, todayString, timerHook.timerState]);

  const handleSplitTimer = useCallback(() => {
    setSplittingTimer(true);
    setSplittingEntry(liveTimerEntry);
  }, [liveTimerEntry]);

  /**
   * Persiste el resultado de dividir. En un Registro guardado las dos mitades van
   * a la base local; en el timer en curso solo se guarda la primera y el timer se
   * re-ancla al punto de corte, de modo que la segunda mitad sigue corriendo.
   */
  const handleUndoSplit = useCallback(async () => {
    const undo = splitUndo.current;
    if (!undo) return;

    if (undo.invalidated) {
      splitUndo.current = null;
      toast.error('No se puede deshacer: una de las mitades ya se sincronizó');
      return;
    }

    // Los ids se guardan tal como los asignó la capa que persistió: el diálogo
    // construye mitades con ids propios que nunca llegan a la base.
    if (undo.secondId) await deleteEntry(undo.secondId);

    // En el timer en curso la primera mitad se persistió como Registro nuevo, así
    // que se borra; en un Registro guardado sólo se recorta la original.
    if (undo.fromTimer) {
      if (undo.firstId) await deleteEntry(undo.firstId);
    } else if (undo.firstId) {
      await updateEntry(undo.firstId, {
        endTime: undo.original.endTime,
        duration: undo.original.duration,
      });
    }

    if (undo.timerStartTime) {
      await timerHook.updateStartTime(undo.timerStartTime);
    }

    if (undo.secondId) {
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(undo.secondId!);
        return next;
      });
    }

    splitUndo.current = null;
    toast.success('División deshecha');
  }, [deleteEntry, updateEntry, timerHook]);

  const handleSplitConfirm = useCallback(
    async ({ first, second }: { first: TimeEntry; second: TimeEntry }) => {
      const restoringTimerStart = splittingTimer ? timerHook.timerState?.startTime : undefined;

      let undo: NonNullable<typeof splitUndo.current>;

      if (splittingTimer) {
        // Sólo se persiste la primera mitad; la segunda sigue corriendo en el timer.
        const created = await createEntry({
          taskId: first.taskId,
          taskName: first.taskName,
          date: first.date,
          startTime: first.startTime,
          endTime: first.endTime,
          description: first.description,
        });
        await timerHook.updateStartTime(new Date(`${first.date}T${second.startTime}:00`).toISOString());
        undo = {
          firstId: created.id,
          secondId: null,
          fromTimer: true,
          original: { ...first, endTime: second.endTime, duration: first.duration + second.duration },
          timerStartTime: restoringTimerStart,
          invalidated: false,
        };
      } else {
        const outcome = await splitEntry(first.id, first.endTime);
        if (!outcome.ok) {
          toast.error(outcome.reason);
          return;
        }
        // El id de la mitad nueva lo asigna la capa que persiste, no el diálogo.
        undo = {
          firstId: outcome.first.id,
          secondId: outcome.second.id,
          fromTimer: false,
          original: { ...first, endTime: second.endTime, duration: first.duration + second.duration },
          timerStartTime: restoringTimerStart,
          invalidated: false,
        };

        if (selectedIds.has(first.id)) {
          setSelectedIds((current) => new Set([...current, outcome.second.id]));
        }
      }

      // Se registra antes de mostrar el aviso: el `onClick` del toast captura el
      // buffer actual, no el que existirá en un render posterior.
      splitUndo.current = undo;

      toast('Entrada dividida', {
        action: {
          label: 'Deshacer',
          onClick: () => {
            void handleUndoSplit();
          },
        },
        onAutoClose: () => {
          splitUndo.current = null;
        },
      });
    },
    [splittingTimer, timerHook, createEntry, splitEntry, selectedIds, handleUndoSplit],
  );

  const handlePlayEntry = useCallback(async (entry: TimeEntry) => {
    if (timerHook.isRunning) {
      const result = await timerHook.stop({ persist: false });
      if (result && 'start' in result) {
        await createEntry({
          taskId: result.taskId,
          taskName: result.taskName,
          date: result.end.toLocaleDateString('sv-SE'),
          startTime: result.start.toTimeString().slice(0, 5),
          endTime: result.end.toTimeString().slice(0, 5),
          description: pendingDescription.current,
        });
        toast('Timer de ' + result.taskName + ' detenido. Iniciando ' + entry.taskName + '.');
      }
    }
    pendingDescription.current = entry.description;
    await timerHook.start(entry.taskId, entry.taskName, entry.description);
  }, [timerHook, createEntry]);

  useTableRowShortcuts({
    activeItem,
    onEdit: handleEditEntry,
    onDuplicate: handleDuplicateEntry,
    onPlay: handlePlayEntry,
    onSync: handleSyncEntry,
    onDelete: (entry) => {
      if (window.confirm(`¿Eliminar "${entry.taskName}"?`)) {
        handleDeleteEntry(entry.id);
      }
    },
    isEnabled: () => activeTab === 'table' && !editingEntry && !trackerBarRef.current?.isEditingStartTime,
  });

  // Auto-focus first table row on mount (table view only)
  useEffect(() => {
    if (activeTab !== 'table') return;
    if (filteredByPeriod.length === 0) return;
    if (document.activeElement && (
      document.activeElement.tagName === 'INPUT' ||
      document.activeElement.tagName === 'TEXTAREA' ||
      document.activeElement.tagName === 'SELECT' ||
      document.activeElement.getAttribute('contenteditable') === 'true'
    )) return;
    if (document.querySelector('[role="dialog"][data-state="open"]')) return;
    if (document.querySelector('[cmdk-dialog]')) return;
    focusFirst();
  }, [activeTab, filteredByPeriod.length, focusFirst]);

  const virtualTimerEntry = useMemo(() => {
    if (!timerHook.isRunning || !timerHook.timerState) return null;
    if (!todayInRange) return null;
    return createVirtualTimerEntry(timerHook.timerState, new Date());
  }, [timerHook.isRunning, timerHook.timerState, timerHook.elapsed, todayInRange]);

  // Throttled elapsed for stats cards — updates every 5s to avoid re-rendering 4 cards every second
  const [throttledElapsed, setThrottledElapsed] = useState(0);
  const throttleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerHook.isRunning) {
      // Sync immediately, then every 5 seconds
      setThrottledElapsed(timerHook.elapsed);
      throttleRef.current = setInterval(() => {
        setThrottledElapsed(timerHook.elapsed);
      }, 5000);
    } else {
      if (throttleRef.current) {
        clearInterval(throttleRef.current);
        throttleRef.current = null;
      }
      setThrottledElapsed(0);
    }
    return () => {
      if (throttleRef.current) {
        clearInterval(throttleRef.current);
        throttleRef.current = null;
      }
    };
  }, [timerHook.isRunning, timerHook.elapsed]);

  const periodTotal = useMemo(() => {
    return computePeriodTotal(filteredByPeriod, timerHook.elapsed, todayInRange);
  }, [filteredByPeriod, timerHook.elapsed, todayInRange]);

  const periodTotalDisplay = useMemo(() => formatDurationHMS(periodTotal), [periodTotal]);

  const handlePeriodChange = (newPeriod: PeriodType, newCustomRange?: DateRange) => {
    setPeriod(newPeriod);
    if (newCustomRange) {
      setCustomRange(newCustomRange);
    }
  };

  const handleCreateEntry = useCallback(async (data: TimeEntryFormData) => {
    await createEntry(data);
  }, [createEntry]);

  const handleEditorSubmit = useCallback(async (data: TimeEntryFormData) => {
    if (editingEntry) {
      await updateEntry(editingEntry.id, data);
    } else {
      await createEntry(data);
    }
    setEditingEntry(null);
  }, [editingEntry, updateEntry, createEntry]);

  const handleAcceptProposal = useCallback(async (
    proposal: TaskProposal,
    _proposedName: string,
    processId: string
  ) => {
    const newTaskId = Number(processId);
    if (!Number.isFinite(newTaskId) || newTaskId <= 0) {
      toast.error('ID de proceso inválido');
      return;
    }

    // Reasignar solo entries no confirmadas en SQL Server (synced !== true)
    // que pertenezcan a este grupo (mismo genericTask + descripción normalizada)
    const toReassign = entries.filter(e =>
      proposal.entryIds.includes(e.id) && !e.synced
    );

    if (toReassign.length === 0) {
      toast.info('No hay entradas pendientes para reasignar');
      return;
    }

    try {
      for (const entry of toReassign) {
        await updateEntry(entry.id, {
          taskId: newTaskId,
          taskName: proposal.proposedName,
          proceso: { ...entry.proceso, proceso: newTaskId, nombre: proposal.proposedName },
        });
      }
      toast.success(`${toReassign.length} entrada(s) reasignada(s) a "${proposal.proposedName}"`);
    } catch (error) {
      toast.error('Error al reasignar entradas: ' + (error as Error).message);
    }
  }, [entries, updateEntry]);

  // Register command palette actions for this page
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
      when: () => !!activeItem && !timerHook.isRunning,
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
      when: () => !timerHook.isRunning,
      group: 'TimeTracker',
    },
    {
      id: 'stop-timer',
      label: 'Detener timer',
      icon: <span className="flex items-center"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><rect x="6" y="6" width="12" height="12" rx="2"/></svg></span>,
      action: () => {
        timerHook.stop({ persist: true }).then((result) => {
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
      when: () => timerHook.isRunning,
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
      action: () => {
        setEditingEntry(null);
        setEntryEditorOpen(true);
      },
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
  ], [pendingEntries, handlePlayEntry, timerHook.isRunning, timerHook.stop, createEntry, activeTab, activeItem, handleEditEntry, handleDeleteEntry, handleDuplicateEntry, handleSyncEntry]);

  useCommandActions('time-tracker', commandActions);

  return (
    <main className="w-full">
      {/* Sticky tracker bar — always visible */}
      <div className="sticky top-0 z-40 bg-background border-b border-border/50 backdrop-blur-sm">
        <div className="px-4 sm:px-6 py-3">
          <TimeTrackerBar
            ref={trackerBarRef}
            onSubmit={handleCreateEntry}
            disabled={false}
            onSplitTimer={liveTimerEntry ? handleSplitTimer : undefined}
            splitDisabledReason={timerSplitDisabledReason}
            timer={timerHook}
          />
        </div>
      </div>

      <TimeEntryEditorDialog
        open={entryEditorOpen}
        mode={editingEntry ? 'edit' : 'create'}
        entry={editingEntry}
        onOpenChange={(open) => {
          setEntryEditorOpen(open);
          if (!open) setEditingEntry(null);
        }}
        onSubmit={handleEditorSubmit}
      />

      <SplitEntryDialog
        open={splittingEntry !== null}
        entry={splittingEntry}
        live={splittingTimer}
        onOpenChange={(open) => {
          if (!open) {
            setSplittingEntry(null);
            setSplittingTimer(false);
          }
        }}
        onConfirm={handleSplitConfirm}
      />

      <div className="px-4 sm:px-6 py-5 space-y-5">
         {/* Period progress panel */}
        <PeriodProgressPanel
          entries={entries}
          period={period}
          periodRange={periodRange}
          timerElapsed={timerHook.isRunning ? throttledElapsed : 0}
          todayInRange={todayInRange}
        />

        <TaskProposalModal
          open={proposalModalOpen}
          onOpenChange={setProposalModalOpen}
          proposals={proposals}
          onAccept={handleAcceptProposal}
          config={{
            usuario: wizardConfig.get()?.usuario ?? '',
            fase: wizardConfig.get()?.fase ?? '',
            tipoHora: wizardConfig.get()?.tipoHora ?? '11',
          }}
        />

        {/* Period selector + View tabs row */}
        <div className="flex items-center justify-between flex-col sm:flex-row gap-4">
          <PeriodSelector
            value={period}
            customRange={customRange}
            onChange={handlePeriodChange}
          />
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Vista:</span>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="table" className="gap-1.5">
                  <Table className="w-4 h-4" />
                  Tabla
                </TabsTrigger>
                <TabsTrigger value="grouped" className="gap-1.5">
                  <LayoutGrid className="w-4 h-4" />
                  Agrupado
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

    

      <OverlapAlert entries={filteredByPeriod} onApplyFix={handleApplyOverlapFix} />

      <div className="space-y-4">
        {/* List header with period total + sync icon */}
        <div className="flex justify-between items-center flex-col sm:flex-row sm:items-baseline gap-2">
          <h3 className="text-xl font-semibold tracking-tight">
            Mis Registros ({filteredByPeriod.length})
          </h3>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Total del período:{' '}
              <strong className="text-foreground font-medium">{periodTotalDisplay}</strong>
            </span>
            {proposals.length > 0 && (
              <button
                onClick={() => setProposalModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                title={`${proposals.length} propuesta(s) de tarea pendiente(s)`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{proposals.length} propuesta{proposals.length !== 1 ? 's' : ''}</span>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                </span>
              </button>
            )}
            {pendingEntries.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSyncPanelOpen((prev) => !prev)}
                className="gap-2"
              >
                <Database className="w-4 h-4" />
                Sync ({selectedIds.size > 0
                  ? `${entriesToSync.length}/${pendingEntries.length}`
                  : pendingEntries.length
                })
              </Button>
            )}
          </div>
        </div>

        {syncPanelOpen && (
          <SyncPanel
            selectedEntries={entriesToSync}
            totalPendingCount={pendingEntries.length}
            onSyncComplete={markSynced}
          />
        )}

        <TimeEntryViewSwitcher
          entries={filteredByPeriod}
          selectedIds={selectedIds}
          onSelect={setSelectedIds}
          onDelete={handleDeleteEntry}
          onEdit={handleEditEntry}
          onPlay={handlePlayEntry}
          onDuplicate={handleDuplicateEntry}
          onSplit={handleSplitEntry}
          onSync={handleSyncEntry}
          activeTab={activeTab}
          timerEntry={virtualTimerEntry}
          onSplitTimer={liveTimerEntry ? handleSplitTimer : undefined}
          timerSplitDisabledReason={timerSplitDisabledReason}
          tableRef={tableRef}
          getRowProps={getRowProps}
        />
      </div>
      </div>
    </main>
  );
}
