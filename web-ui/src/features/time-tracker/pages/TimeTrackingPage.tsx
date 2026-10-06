import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Database, Table, LayoutGrid, Pencil, Trash2, Copy, Play, RefreshCw, Lightbulb, Split } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PeriodSelector } from '@/components/shared/PeriodSelector';
import { TimeTrackerBar } from '../components/TimeTrackerBar';
import { TimeEntryEditorDialog } from '../components/TimeEntryEditorDialog';
import { SplitEntryDialog } from '../components/SplitEntryDialog';
import { splitAffordance } from '../lib/splitEntry';
import { TimeEntryViewSwitcher } from '../components/TimeEntryViewSwitcher';
import { OverlapAlert } from '../components/OverlapAlert';
import type { OverlapFix } from '../lib/overlaps';
import { SyncPanel } from '../components/SyncPanel';
import { PeriodProgressPanel } from '../components/PeriodProgressPanel';
import { useTimeEntries } from '../hooks/useTimeEntries';
import { useTimerView } from '../hooks/useTimerView';
import { usePeriodFilter } from '../hooks/usePeriodFilter';
import { useEntryEditor } from '../hooks/useEntryEditor';
import { useEntrySync } from '../hooks/useEntrySync';
import { useSplitFlow } from '../hooks/useSplitFlow';
import { useProposals } from '../hooks/useProposals';
import { useCommandActions } from '@/components/CommandActionsContext';
import { useTableKeyboardNavigation } from '@/hooks/useTableKeyboardNavigation';
import { useTableRowShortcuts } from '@/hooks/useTableRowShortcuts';
import { wizardConfig } from '@/config/stores';
import { TaskProposalModal } from '@/features/proposal-ui/components/TaskProposalModal';

export function TimeTrackingPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { entries, createEntry, updateEntry, deleteEntry, splitEntry, splitRunningTimer, markSynced } = useTimeEntries();
  const timerView = useTimerView({ createEntry });
  const {
    timer,
    trackerBarRef,
    pendingDescription,
    liveTimerEntry,
    virtualTimerEntry,
    throttledElapsed,
    timerSplitDisabledReason,
    handlePlayEntry,
  } = timerView;

  /** Limpia de la selección el Registro eliminado; la selección vive en la página. */
  const handleEntryDeleted = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);

  const {
    isEditorOpen,
    editingEntry,
    openEdit: handleEditEntry,
    openCreate,
    handleOpenChange,
    submit: handleEditorSubmit,
    create: handleCreateEntry,
    duplicate: handleDuplicateEntry,
    remove: handleDeleteEntry,
  } = useEntryEditor({
    entries,
    createEntry,
    updateEntry,
    deleteEntry,
    onEntryDeleted: handleEntryDeleted,
  });

  const {
    period,
    customRange,
    activeTab,
    setActiveTab,
    periodRange,
    filteredByPeriod,
    todayInRange,
    periodTotalDisplay,
    handlePeriodChange,
  } = usePeriodFilter({ entries, timerElapsed: timer.elapsed });

  const {
    splittingEntry,
    splittingTimer,
    handleSplitEntry,
    handleSplitTimer,
    handleSplitDialogOpenChange,
    handleSplitConfirm,
    handleEntriesSynced,
  } = useSplitFlow({
    splitEntry,
    splitRunningTimer,
    deleteEntry,
    updateEntry,
    timer,
    liveTimerEntry,
    selectedIds,
    setSelectedIds,
  });

  const tableRef = useRef<HTMLTableElement>(null);

  const { syncPanelOpen, setSyncPanelOpen, pendingEntries, entriesToSync, handleSyncEntry } =
    useEntrySync({ entries, selectedIds, markSynced, onEntriesSynced: handleEntriesSynced });

  const { proposalModalOpen, setProposalModalOpen, proposals, handleAcceptProposal } =
    useProposals({ entries, updateEntry });

  const { getRowProps, focusFirst, activeItem } = useTableKeyboardNavigation({
    containerRef: tableRef,
    items: filteredByPeriod,
    getRowId: (entry) => entry.id,
    isEnabled: activeTab === 'table' && !editingEntry,
  });

  const handleApplyOverlapFix = useCallback(async (fix: OverlapFix) => {
    try {
      await updateEntry(fix.entryId, fix.patch);
      toast.success('Solapamiento corregido');
    } catch (error) {
      console.error('Error applying overlap fix:', error);
      toast.error('No se pudo aplicar la corrección');
    }
  }, [updateEntry]);

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
            timer={timer}
          />
        </div>
      </div>

      <TimeEntryEditorDialog
        open={isEditorOpen}
        mode={editingEntry ? 'edit' : 'create'}
        entry={editingEntry}
        onOpenChange={handleOpenChange}
        onSubmit={handleEditorSubmit}
      />

      <SplitEntryDialog
        open={splittingEntry !== null}
        entry={splittingEntry}
        live={splittingTimer}
        onOpenChange={handleSplitDialogOpenChange}
        onConfirm={handleSplitConfirm}
      />

      <div className="px-4 sm:px-6 py-5 space-y-5">
         {/* Period progress panel */}
        <PeriodProgressPanel
          entries={entries}
          period={period}
          periodRange={periodRange}
          timerElapsed={timer.isRunning ? throttledElapsed : 0}
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
          timerEntry={todayInRange ? virtualTimerEntry : null}
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
