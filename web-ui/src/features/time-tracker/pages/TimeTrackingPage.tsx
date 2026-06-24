import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Database, Table, LayoutGrid, Pencil, Trash2, Copy, Play, RefreshCw, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PeriodSelector } from '@/components/shared/PeriodSelector';
import { TimeTrackerBar } from '../components/TimeTrackerBar';
import type { TimeTrackerBarHandle } from '../components/TimeTrackerBar';
import { TimeEntryViewSwitcher } from '../components/TimeEntryViewSwitcher';
import { OverlapAlert } from '../components/OverlapAlert';
import { SyncPanel } from '../components/SyncPanel';
import { PeriodProgressPanel } from '../components/PeriodProgressPanel';
import { useTimeEntries } from '../hooks/useTimeEntries';
import { useTimer } from '../hooks/useTimer';
import { useCommandActions } from '@/components/CommandActionsContext';
import { useTableKeyboardNavigation } from '@/hooks/useTableKeyboardNavigation';
import { useTableRowShortcuts } from '@/hooks/useTableRowShortcuts';
import { createVirtualTimerEntry } from '../lib/timerVirtualEntry';
import { computePeriodTotal } from '../lib/computePeriodTotal';
import { syncTimeEntries } from '../services/timeEntrySyncService';
import { wizardConfig, dbConfig, proposalConfig } from '@/config/stores';
import { TaskProposalModal } from '@/features/proposal-ui/components/TaskProposalModal';
import { extractProposalsFromLocal } from '@/domain/proposals/extract-local-proposals';
import type { TaskProposal } from '@/domain/proposals/extract-proposals';
import type { TimeEntry } from '../types';
import type { PeriodType, DateRange } from '@/components/shared/PeriodSelector';

function formatDurationHMS(totalSeconds: number): string {
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function TimeTrackingPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [syncPanelOpen, setSyncPanelOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [period, setPeriod] = useState<PeriodType>('week');
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [activeTab, setActiveTab] = useState('table');
  const [proposalModalOpen, setProposalModalOpen] = useState(false);

  const { entries, createEntry, updateEntry, deleteEntry, markSynced } = useTimeEntries();
  const timerHook = useTimer();

  const undoBuffer = useRef<Map<string, TimeEntry>>(new Map());
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

  const filteredByPeriod = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let start: Date;
    let end: Date;

    switch (period) {
      case 'today':
        start = today; end = now; break;
      case 'week': {
        const dayOfWeek = now.getDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        start = new Date(today); start.setDate(today.getDate() - diffToMonday);
        end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
        break;
      }
      case 'month': {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      }
      case 'last-month': {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      }
      case 'custom':
        start = customRange?.start || today;
        end = customRange?.end || now;
        break;
      default:
        start = today; end = now;
    }

    const startDay = start.getFullYear() * 10000 + (start.getMonth() + 1) * 100 + start.getDate();
    const endDay = end.getFullYear() * 10000 + (end.getMonth() + 1) * 100 + end.getDate();

    return entries.filter(e => {
      const d = new Date(e.date + 'T12:00:00');
      const entryDay = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      return entryDay >= startDay && entryDay <= endDay;
    });
  }, [entries, period, customRange]);

  const proposals = useMemo(() => {
    // Solo entradas del mes actual (consistente con LiveTimeEntriesPage)
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
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayDay = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

    if (period === 'today') return true;

    let start: Date;
    let end: Date;

    switch (period) {
      case 'week': {
        const dayOfWeek = now.getDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        start = new Date(today); start.setDate(today.getDate() - diffToMonday);
        end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23,59,59,999);
        break;
      }
      case 'month': {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      }
      case 'last-month': {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      }
      case 'custom':
        start = customRange?.start || today;
        end = customRange?.end || now;
        break;
      default:
        return false;
    }

    const startDay = start.getFullYear() * 10000 + (start.getMonth() + 1) * 100 + start.getDate();
    const endDay = end.getFullYear() * 10000 + (end.getMonth() + 1) * 100 + end.getDate();
    return todayDay >= startDay && todayDay <= endDay;
  }, [period, customRange]);

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
  }, []);

  const handleEditCancel = useCallback(() => {
    setEditingEntry(null);
    trackerBarRef.current?.reset();
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
      toast.success(`Sincronizado: ${entry.taskName}`);
    } else {
      const error = outcome.results[0]?.error ?? 'Error desconocido';
      toast.error(`Error al sincronizar: ${error}`);
    }
  }, [markSynced]);

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

  const handleSubmit = useCallback(async (data: {
    taskId: number;
    taskName: string;
    date: string;
    startTime: string;
    endTime: string;
    description?: string;
    recoverable: boolean;
  }) => {
    if (editingEntry) {
      await updateEntry(editingEntry.id, data);
      setEditingEntry(null);
    } else {
      await createEntry(data);
    }
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

  useEffect(() => {
    if (!editingEntry) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleEditCancel();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [editingEntry, handleEditCancel]);

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
        trackerBarRef.current?.focusDescription();
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
  ], [pendingEntries, handlePlayEntry, timerHook.isRunning, timerHook.stop, createEntry, activeTab, activeItem, handleEditEntry, handleDeleteEntry, handleDuplicateEntry, handleSyncEntry, trackerBarRef]);

  useCommandActions('time-tracker', commandActions);

  return (
    <main className="w-full">
      {/* Sticky tracker bar — always visible */}
      <div className="sticky top-0 z-40 bg-background border-b border-border/50 backdrop-blur-sm">
        <div className="px-4 sm:px-6 py-3">
          <TimeTrackerBar
            ref={trackerBarRef}
            onSubmit={handleSubmit}
            initialData={editingEntry ?? undefined}
            defaultMode={editingEntry ? 'manual' : 'timer'}
            disabled={false}
            timer={timerHook}
          />
        </div>
          {/* Cancel editing indicator */}
        {editingEntry && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Editando: <strong>{editingEntry.taskName}</strong> — {editingEntry.date}</span>
          <Button variant="ghost" size="sm" onClick={handleEditCancel}>
            Cancelar edición
          </Button>
        </div>
      )}
      </div>

      <div className="px-4 sm:px-6 py-5 space-y-5">
         {/* Period progress panel */}
        <PeriodProgressPanel
          entries={entries}
          period={period}
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

    

      <OverlapAlert entries={filteredByPeriod} />

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
          onSync={handleSyncEntry}
          activeTab={activeTab}
          timerEntry={virtualTimerEntry}
          tableRef={tableRef}
          getRowProps={getRowProps}
        />
      </div>
      </div>
    </main>
  );
}
