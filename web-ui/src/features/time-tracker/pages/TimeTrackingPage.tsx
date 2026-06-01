import { useState } from 'react';
import { Plus, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TimerWidget } from '../components/TimerWidget';
import { TimeEntryForm } from '../components/TimeEntryForm';
import { TimeEntryList } from '../components/TimeEntryList';
import { OverlapAlert } from '../components/OverlapAlert';
import { useTimer } from '../hooks/useTimer';
import { useTimeEntries } from '../hooks/useTimeEntries';

/**
 * Página principal de Mi TimeTracker.
 * Combina temporizador, entrada manual y listado de registros.
 */
export function TimeTrackingPage() {
  const [activeTab, setActiveTab] = useState<'new' | 'list'>('new');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const handleTimerStop = async () => {
    const entry = await stop();
    if (entry) {
      await refresh();
    }
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
    </main>
  );
}