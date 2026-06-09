import { useState, useCallback, useMemo, useRef } from 'react';
import { Database, Table, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PeriodSelector } from '@/components/shared/PeriodSelector';
import { TimeTrackerBar } from '../components/TimeTrackerBar';
import { TimeEntryViewSwitcher } from '../components/TimeEntryViewSwitcher';
import { OverlapAlert } from '../components/OverlapAlert';
import { SyncPanel } from '../components/SyncPanel';
import { useTimeEntries } from '../hooks/useTimeEntries';
import { useTimer } from '../hooks/useTimer';
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

  const { entries, createEntry, updateEntry, deleteEntry, markSynced } = useTimeEntries();
  const timerHook = useTimer();

  const undoBuffer = useRef<Map<string, TimeEntry>>(new Map());
  const pendingDescription = useRef<string | undefined>(undefined);

  const pendingEntries = useMemo(
    () => entries.filter((e) => !e.synced),
    [entries]
  );

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

  const periodTotal = useMemo(() => {
    return filteredByPeriod.reduce((sum, e) => sum + e.duration, 0);
  }, [filteredByPeriod]);

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
    <main className="w-full">
      {/* Sticky tracker bar — always visible */}
      <div className="sticky top-0 z-40 bg-background border-b border-border/50 backdrop-blur-sm">
        <div className="px-4 sm:px-6 py-3">
          <TimeTrackerBar
            onSubmit={handleSubmit}
            initialData={editingEntry ?? undefined}
            defaultMode={editingEntry ? 'manual' : 'timer'}
            disabled={false}
            timer={timerHook}
          />
        </div>
      </div>

      <div className="px-4 sm:px-6 py-5 space-y-5">
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

        {/* Cancel editing indicator */}
        {editingEntry && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Editando: <strong>{editingEntry.taskName}</strong> — {editingEntry.date}</span>
          <Button variant="ghost" size="sm" onClick={handleEditCancel}>
            Cancelar edición
          </Button>
        </div>
      )}

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

        <TimeEntryViewSwitcher
          entries={filteredByPeriod}
          selectedIds={selectedIds}
          onSelect={setSelectedIds}
          onDelete={handleDeleteEntry}
          onEdit={handleEditEntry}
          onPlay={handlePlayEntry}
          activeTab={activeTab}
        />
      </div>
      </div>
    </main>
  );
}
