import { useCallback, useState } from 'react';
import { Database, Table, LayoutGrid, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PeriodSelector } from '@/components/shared/PeriodSelector';
import { TimeTrackerBar } from '../components/TimeTrackerBar';
import { TimeEntryEditorDialog } from '../components/TimeEntryEditorDialog';
import { SplitEntryDialog } from '../components/SplitEntryDialog';
import { TimeEntryViewSwitcher } from '../components/TimeEntryViewSwitcher';
import { OverlapAlert } from '../components/OverlapAlert';
import type { OverlapFix } from '../lib/overlaps';
import type { EntryViewTab, TimeEntry } from '../types';
import { SyncPanel } from '../components/SyncPanel';
import { PeriodProgressPanel } from '../components/PeriodProgressPanel';
import { useTimeEntries } from '../hooks/useTimeEntries';
import { useTimer } from '../hooks/useTimer';
import { useTimerView } from '../hooks/useTimerView';
import { usePeriodFilter } from '../hooks/usePeriodFilter';
import { useEntryEditor } from '../hooks/useEntryEditor';
import { useEntrySync } from '../hooks/useEntrySync';
import { useBulkReassign } from '../hooks/useBulkReassign';
import { BulkReassignDialog } from '../components/BulkReassignDialog';
import { useSplitFlow } from '../hooks/useSplitFlow';
import { useProposals } from '../hooks/useProposals';
import { useEntrySelection } from '../hooks/useEntrySelection';
import { useEntryTableNavigation } from '../hooks/useEntryTableNavigation';
import { useTimeTrackerCommandActions } from '../hooks/useTimeTrackerCommandActions';
import { wizardConfig } from '@/config/stores';
import { TaskProposalModal } from '@/features/proposal-ui/components/TaskProposalModal';

export function TimeTrackingPage() {
  const { entries, createEntry, updateEntry, deleteEntry, splitEntry, splitRunningTimer, markSynced } = useTimeEntries();

  const timer = useTimer();

  const { selectedIds, setSelectedIds, tableRef, handleEntryDeleted } = useEntrySelection();

  // Lista que la tabla está pintando (con sus filtros y orden): la comparten los
  // atajos de fila para no actuar sobre otro registro. Null hasta el primer render.
  const [visibleEntries, setVisibleEntries] = useState<TimeEntry[] | null>(null);

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
    trackerBarRef,
    pendingDescription,
    liveTimerEntry,
    virtualTimerEntry,
    throttledElapsed,
    timerSplitDisabledReason,
    handlePlayEntry,
  } = useTimerView({ createEntry, timer, todayInRange });

  const {
    splittingEntry,
    splittingTimer,
    handleSplitEntry,
    handleSplitTimer,
    handleSplitDialogOpenChange,
    handleSplitConfirm,
    invalidateSplitUndo,
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

  const { syncPanelOpen, setSyncPanelOpen, pendingEntries, blockedEntries, entriesToSync, handleSyncEntry } =
    useEntrySync({ entries, selectedIds, markSynced, onEntriesSynced: invalidateSplitUndo });

  const {
    reassignOpen,
    setReassignOpen,
    reassignableCount,
    skippedSyncedCount,
    handleReassign,
  } = useBulkReassign({ entries, selectedIds, setSelectedIds, updateEntry });

  const { proposalModalOpen, setProposalModalOpen, proposals, handleAcceptProposal } =
    useProposals({ entries, updateEntry });

  const handleApplyOverlapFix = useCallback(async (fix: OverlapFix) => {
    try {
      await updateEntry(fix.entryId, fix.patch);
      toast.success('Solapamiento corregido');
    } catch (error) {
      console.error('Error applying overlap fix:', error);
      toast.error('No se pudo aplicar la corrección');
    }
  }, [updateEntry]);

  const { getRowProps, activeItem } = useEntryTableNavigation({
    tableRef,
    items: visibleEntries ?? filteredByPeriod,
    activeTab,
    editingEntry,
    trackerBarRef,
    onEdit: handleEditEntry,
    onDuplicate: handleDuplicateEntry,
    onPlay: handlePlayEntry,
    onSync: handleSyncEntry,
    onDelete: handleDeleteEntry,
  });

  // Register command palette actions for this page
  useTimeTrackerCommandActions({
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
  });

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
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as EntryViewTab)}>
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

        <BulkReassignDialog
          open={reassignOpen}
          onOpenChange={setReassignOpen}
          count={reassignableCount}
          skippedSyncedCount={skippedSyncedCount}
          onConfirm={handleReassign}
        />

        {syncPanelOpen && (
          <SyncPanel
            selectedEntries={entriesToSync}
            totalPendingCount={pendingEntries.length}
            blockedCount={blockedEntries.length}
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
          onReassignSelected={() => setReassignOpen(true)}
          activeTab={activeTab}
          timerEntry={virtualTimerEntry}
          onSplitTimer={liveTimerEntry ? handleSplitTimer : undefined}
          timerSplitDisabledReason={timerSplitDisabledReason}
          tableRef={tableRef}
          getRowProps={getRowProps}
          onVisibleEntriesChange={setVisibleEntries}
        />
      </div>
      </div>
    </main>
  );
}
