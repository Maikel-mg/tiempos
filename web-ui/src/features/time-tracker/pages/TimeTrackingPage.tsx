import { useState, useCallback, useMemo, useRef } from 'react';
import { Database } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TimeTrackerBar } from '../components/TimeTrackerBar';
import { TimeEntryList } from '../components/TimeEntryList';
import { OverlapAlert } from '../components/OverlapAlert';
import { SyncPanel } from '../components/SyncPanel';
import { useTimeEntries } from '../hooks/useTimeEntries';
import { useTimer } from '../hooks/useTimer';
import type { TimeEntry } from '../types';

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

  const { entries, createEntry, updateEntry, deleteEntry, markSynced } = useTimeEntries();
  const timerHook = useTimer();

  const undoBuffer = useRef<Map<string, TimeEntry>>(new Map());
  const pendingDescription = useRef<string | undefined>(undefined);

  const pendingEntries = useMemo(
    () => entries.filter((e) => !e.synced),
    [entries]
  );

  const weeklyTotal = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekEntries = entries.filter((e) => {
      const d = new Date(e.date);
      return d >= monday && d <= sunday;
    });
    return weekEntries.reduce((sum, e) => sum + e.duration, 0);
  }, [entries]);

  const weeklyTotalDisplay = useMemo(() => formatDurationHMS(weeklyTotal), [weeklyTotal]);

  const handleSubmit = useCallback(async (data: {
    taskId: number;
    taskName: string;
    date: string;
    startTime: string;
    endTime: string;
    description?: string;
  }) => {
    if (editingEntry) {
      await updateEntry(editingEntry.id, data);
      setEditingEntry(null);
    } else {
      await createEntry(data);
    }
  }, [editingEntry, updateEntry, createEntry]);

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
  }, []);

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
    await timerHook.start(entry.taskId, entry.taskName);
  }, [timerHook, createEntry]);

  return (
    <main className="w-full px-4 py-6 space-y-6">
      <TimeTrackerBar
        onSubmit={handleSubmit}
        initialData={editingEntry ?? undefined}
        defaultMode={editingEntry ? 'manual' : 'timer'}
        disabled={false}
        timer={timerHook}
      />

      {/* Cancel editing indicator */}
      {editingEntry && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Editando: <strong>{editingEntry.taskName}</strong> — {editingEntry.date}</span>
          <Button variant="ghost" size="sm" onClick={handleEditCancel}>
            Cancelar edición
          </Button>
        </div>
      )}

      <OverlapAlert entries={entries} />

      <div className="space-y-4">
        {/* List header with weekly total + sync icon */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            Mis Registros ({entries.length})
          </h3>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Total semanal: <strong className="text-foreground">{weeklyTotalDisplay}</strong>
            </span>
            {pendingEntries.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSyncPanelOpen((prev) => !prev)}
                className="gap-2"
              >
                <Database className="w-4 h-4" />
                Sync ({pendingEntries.length})
              </Button>
            )}
          </div>
        </div>

        {syncPanelOpen && (
          <SyncPanel
            selectedEntries={pendingEntries}
            onSyncComplete={markSynced}
          />
        )}

        <TimeEntryList
          entries={entries}
          selectedIds={selectedIds}
          onSelect={setSelectedIds}
          onDelete={handleDeleteEntry}
          onEdit={handleEditEntry}
          onPlay={handlePlayEntry}
        />
      </div>
    </main>
  );
}
