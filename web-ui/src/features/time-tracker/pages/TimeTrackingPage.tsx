import { useState, useCallback } from 'react';
import { Plus, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TimerWidget } from '../components/TimerWidget';
import { TimeEntryForm } from '../components/TimeEntryForm';
import { TimeEntryList } from '../components/TimeEntryList';
import { OverlapAlert } from '../components/OverlapAlert';
import { MidnightSplitModal } from '../components/MidnightSplitModal';
import { useTimer } from '../hooks/useTimer';
import { useTimeEntries } from '../hooks/useTimeEntries';
import { detectCrossing } from '../lib/timerCrossingDetector';
import type { SplitProposal } from '../lib/timerCrossingDetector';
import type { StopTimerResult } from '../services/timeTrackingService';

/**
 * Página principal de Mi TimeTracker.
 * Combina temporizador, entrada manual y listado de registros.
 */
export function TimeTrackingPage() {
  const [activeTab, setActiveTab] = useState<'new' | 'list'>('new');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Midnight split modal state
  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [splitProposal, setSplitProposal] = useState<SplitProposal[]>([]);
  const [pendingStop, setPendingStop] = useState<StopTimerResult | null>(null);

  // Hooks
  const { entries, createEntry, deleteEntry, refresh } = useTimeEntries();
  const { isRunning, elapsed, start, stop, cancel, timerState } = useTimer();

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
    await deleteEntry(id);
    // Remove from selected if exists
    const newSelected = new Set(selectedIds);
    newSelected.delete(id);
    setSelectedIds(newSelected);
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
        <TimeEntryList
          entries={entries}
          selectedIds={selectedIds}
          onSelect={setSelectedIds}
          onDelete={handleDeleteEntry}
        />
      )}

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