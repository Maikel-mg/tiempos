import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { TimeEntryList } from './TimeEntryList';
import { GroupedEntryView } from './GroupedEntryView';
import { TimerRow } from './TimerRow';
import type { TimeEntry } from '../types';

interface TimerEntryData {
  taskName: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  description?: string;
}

interface TimeEntryViewSwitcherProps {
  entries: TimeEntry[];
  selectedIds: Set<string>;
  onSelect: (ids: Set<string>) => void;
  onDelete: (id: string) => Promise<void>;
  onEdit?: (entry: TimeEntry) => void;
  onPlay?: (entry: TimeEntry) => void;
  onDuplicate?: (entry: TimeEntry) => void;
  activeTab: string;
  timerEntry?: TimerEntryData | null;
}

export function TimeEntryViewSwitcher({
  entries,
  selectedIds,
  onSelect,
  onDelete,
  onEdit,
  onPlay,
  onDuplicate,
  activeTab,
  timerEntry,
}: TimeEntryViewSwitcherProps) {
  const [filterTask, setFilterTask] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'duration' | 'task'>('date');
  const [filterSync, setFilterSync] = useState<'all' | 'pending' | 'synced' | 'failed'>('all');

  const filtered = useMemo(() => {
    let result = [...entries];

    if (filterTask) {
      result = result.filter(e =>
        e.taskName.toLowerCase().includes(filterTask.toLowerCase())
      );
    }
    if (filterSync === 'pending') {
      result = result.filter(e => !e.synced && !e.syncError);
    } else if (filterSync === 'synced') {
      result = result.filter(e => e.synced);
    } else if (filterSync === 'failed') {
      result = result.filter(e => !e.synced && !!e.syncError);
    }

    // Sort only applies to table view
    if (activeTab === 'table') {
      result.sort((a, b) => {
        if (sortBy === 'date') return b.date.localeCompare(a.date);
        if (sortBy === 'duration') return b.duration - a.duration;
        return a.taskName.localeCompare(b.taskName);
      });
    }

    return result;
  }, [entries, filterTask, filterSync, sortBy, activeTab]);

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    onSelect(newSet);
  };

  const selectAll = () => {
    const unsynced = filtered.filter(e => !e.synced).map(e => e.id);
    onSelect(new Set(unsynced));
  };

  const deselectAll = () => {
    onSelect(new Set());
  };

  const selectedCount = selectedIds.size;

  return (
    <Card className="bg-card border border-border">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle>
            {entries.length} registros
            {entries.length !== filtered.length && (
              <span className="text-muted-foreground font-normal ml-2">
                ({filtered.length} mostrados)
              </span>
            )}
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            {selectedCount > 0 && (
              <span className="text-sm text-muted-foreground self-center mr-2">
                {selectedCount} seleccionados
              </span>
            )}
            <Button variant="outline" size="sm" onClick={selectAll}>
              Seleccionar sin sincronizar
            </Button>
            {selectedCount > 0 && (
              <Button variant="outline" size="sm" onClick={deselectAll}>
                Deseleccionar
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mt-4">
          <div className="space-y-1.5">
            <Label htmlFor="filter-task" className="text-xs">Filtrar por tarea</Label>
            <Input
              id="filter-task"
              placeholder="Buscar tarea..."
              value={filterTask}
              onChange={(e) => setFilterTask(e.target.value)}
              className="w-40"
            />
          </div>
          {activeTab === 'table' && (
            <div className="space-y-1.5">
              <Label className="text-xs">Ordenar por</Label>
              <Select value={sortBy} onValueChange={(v: string) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-40 h-10">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Fecha</SelectItem>
                  <SelectItem value="duration">Duración</SelectItem>
                  <SelectItem value="task">Tarea</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs">Estado sincronización</Label>
            <Select value={filterSync} onValueChange={(v: string) => setFilterSync(v as typeof filterSync)}>
              <SelectTrigger className="w-40 h-10">
                <SelectValue placeholder="Estado sincronización" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="synced">Sincronizado</SelectItem>
                <SelectItem value="failed">Fallido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {activeTab === 'table' ? (
          <TimeEntryList
            entries={filtered}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onDelete={onDelete}
            onEdit={onEdit}
            onPlay={onPlay}
            onDuplicate={onDuplicate}
            timerEntry={timerEntry}
          />
        ) : (
          <GroupedEntryView
            entries={filtered}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onDelete={onDelete}
            onEdit={onEdit}
            onPlay={onPlay}
            onDuplicate={onDuplicate}
            timerEntry={timerEntry}
          />
        )}
      </CardContent>
    </Card>
  );
}
