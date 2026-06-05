import { useState, useCallback, useMemo, useRef } from 'react';
import { Plus, List, Database, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TimerWidget } from '../components/TimerWidget';
import { TimeEntryForm } from '../components/TimeEntryForm';
import { TimeEntryList } from '../components/TimeEntryList';
import { OverlapAlert } from '../components/OverlapAlert';
import { MidnightSplitModal } from '../components/MidnightSplitModal';
import { SyncPanel } from '../components/SyncPanel';
import { useTimer } from '../hooks/useTimer';
import { useTimeEntries } from '../hooks/useTimeEntries';
import { detectCrossing } from '../lib/timerCrossingDetector';
import type { SplitProposal } from '../lib/timerCrossingDetector';
import type { StopTimerResult } from '../services/timeTrackingService';
import type { TimeEntry } from '../types';

/**
 * Página principal de Mi TimeTracker.
 * Combina temporizador, entrada manual y listado de registros.
 */
export function TimeTrackingPage() {
  const [activeTab, setActiveTab] = useState<'new' | 'list'>('new');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [syncPanelOpen, setSyncPanelOpen] = useState(false);

  // Midnight split modal state
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [splitProposal, setSplitProposal] = useState<SplitProposal[]>([]);
  const [pendingStop, setPendingStop] = useState<StopTimerResult | null>(null);

  // Hooks
  const { entries, createEntry, updateEntry, deleteEntry, markSynced, refresh } = useTimeEntries();
  const { isRunning, elapsed, start, stop, cancel, timerState } = useTimer();

  // Edit dialog state
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  // Undoable delete buffer — stores entry temporarily for undo
  const undoBuffer = useRef<Map<string, TimeEntry>>(new Map());
  const pendingDescription = useRef<string | undefined>(undefined);

  // Pending entries for sync
  const pendingEntries = useMemo(
    () => entries.filter((e) => !e.synced),
    [entries]
  );

  // Handlers
  const handleCreateEntry = async (data: {
    taskId: number;
    taskName: string;
    date: string;
    startTime: string;
    endTime: string;
    description?: string;
  }) => {
    await createEntry(data);
    setActiveTab('list');
  };

  const handleDeleteEntry = async (id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;

    // Remove from state optimistically
    await deleteEntry(id);
    // Remove from selected if exists
    const newSelected = new Set(selectedIds);
    newSelected.delete(id);
    setSelectedIds(newSelected);

    // Store in undo buffer
    undoBuffer.current.set(id, entry);

    // Show undo toast — sonner replaces previous toasts automatically
    toast('Entrada eliminada', {
      action: {
        label: 'Deshacer',
        onClick: async () => {
          // Re-insert with original UUID
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
        // Entry already removed from IndexedDB — buffer cleanup
        undoBuffer.current.delete(id);
      },
    });
  };

  const createEntryFromStop = useCallback(async (result: StopTimerResult) => {
    const date = result.end.toLocaleDateString('sv-SE'); // YYYY-MM-DD in local tz — attributed to end day
    await createEntry({
      taskId: result.taskId,
      taskName: result.taskName,
      date,
      startTime: result.start.toTimeString().slice(0, 5),
      endTime: result.end.toTimeString().slice(0, 5),
    });
    await refresh();
  }, [createEntry, refresh]);

  const handleTimerStop = async () => {
    const result = await stop({ persist: false });
    if (!result || !('start' in result)) return;

    const crossing = detectCrossing(result.start, result.end);
    if (crossing.crossed && crossing.splits) {
      setSplitProposal(crossing.splits);
      setPendingStop(result);
      setSplitModalOpen(true);
    } else {
      await createEntryFromStop(result);
    }
  };

  const handleSplitConfirm = async () => {
    if (!pendingStop) return;
    for (const split of splitProposal) {
      await createEntry({
        taskId: pendingStop.taskId,
        taskName: pendingStop.taskName,
        date: split.date,
        startTime: split.startTime,
        endTime: split.endTime,
      });
    }
    await refresh();
    setSplitModalOpen(false);
    setPendingStop(null);
    setSplitProposal([]);
  };

  const handleKeepSingle = async () => {
    if (!pendingStop) return;
    await createEntryFromStop(pendingStop);
    setSplitModalOpen(false);
    setPendingStop(null);
    setSplitProposal([]);
  };

  // Edit handlers
  const handleEditEntry = (entry: TimeEntry) => {
    setEditingEntry(entry);
  };

  const handleEditSave = async (data: {
    taskId: number;
    taskName: string;
    date: string;
    startTime: string;
    endTime: string;
    description?: string;
  }) => {
    if (!editingEntry) return;
    await updateEntry(editingEntry.id, data);
    setEditingEntry(null);
  };

  const handleEditCancel = () => {
    setEditingEntry(null);
  };

  const handlePlayEntry = useCallback(async (entry: TimeEntry) => {
    if (isRunning) {
      const result = await stop({ persist: false });
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
    await start(entry.taskId, entry.taskName);
  }, [isRunning, stop, createEntry, start]);

  return (
    <main className="container mx-auto px-4 py-6 space-y-6">
      {/* Timer Widget */}
      <TimerWidget
        isRunning={isRunning}
        elapsed={elapsed}
        timerTask={timerState?.taskName}
        onStart={start}
        onStop={handleTimerStop}
        onCancel={cancel}
      />

      {/* Overlap Alert - Siempre visible */}
      <OverlapAlert entries={entries} />

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === 'new' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('new')}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Registro
        </Button>
        <Button
          variant={activeTab === 'list' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('list')}
          className="gap-2"
        >
          <List className="w-4 h-4" />
          Mis Registros
          {entries.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-muted rounded-full">
              {entries.length}
            </span>
          )}
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'new' ? (
        <TimeEntryForm
          onSubmit={handleCreateEntry}
        />
      ) : (
        <>
          <TimeEntryList
            entries={entries}
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
            onDelete={handleDeleteEntry}
            onEdit={handleEditEntry}
            onPlay={handlePlayEntry}
          />

          {/* Sync Panel — only when pending entries exist */}
          {pendingEntries.length > 0 && (
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={() => setSyncPanelOpen((prev) => !prev)}
                className="gap-2"
              >
                <Database className="w-4 h-4" />
                Sincronizar {pendingEntries.length} registros
                {syncPanelOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
              {syncPanelOpen && (
                <SyncPanel
                  selectedEntries={pendingEntries}
                  onSyncComplete={markSynced}
                />
              )}
            </div>
          )}
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={editingEntry !== null} onOpenChange={(open) => { if (!open) setEditingEntry(null); }}>
        <DialogContent onClose={handleEditCancel}>
          <DialogHeader>
            <DialogTitle>Editar Registro</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <TimeEntryForm
              initialData={editingEntry}
              onSubmit={handleEditSave}
              onCancel={handleEditCancel}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Midnight Split Modal */}
      <MidnightSplitModal
        open={splitModalOpen}
        onOpenChange={setSplitModalOpen}
        proposal={splitProposal}
        onSplit={handleSplitConfirm}
        onKeepSingle={handleKeepSingle}
      />
    </main>
  );
}