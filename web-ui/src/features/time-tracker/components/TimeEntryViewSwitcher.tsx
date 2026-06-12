import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { TimeEntryList } from './TimeEntryList';
import { GroupedEntryView } from './GroupedEntryView';
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
  onSync?: (entry: TimeEntry) => void;
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
  onSync,
  activeTab,
  timerEntry,
}: TimeEntryViewSwitcherProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'duration' | 'task'>('date');
  const [filterSync, setFilterSync] = useState<'all' | 'pending' | 'synced' | 'failed'>('all');
  const [filterRecoverable, setFilterRecoverable] = useState<'all' | 'normal' | 'recoverable'>('all');

  const filtered = useMemo(() => {
    let result = [...entries];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.taskName.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q))
      );
    }
    if (filterSync === 'pending') {
      result = result.filter(e => !e.synced && !e.syncError);
    } else if (filterSync === 'synced') {
      result = result.filter(e => e.synced);
    } else if (filterSync === 'failed') {
      result = result.filter(e => !e.synced && !!e.syncError);
    }
    if (filterRecoverable === 'normal') {
      result = result.filter(e => e.recoverable !== true);
    } else if (filterRecoverable === 'recoverable') {
      result = result.filter(e => e.recoverable === true);
    }

    // Sort only applies to table view
    if (activeTab === 'table') {
      result.sort((a, b) => {
        if (sortBy === 'date') {
          const dateCmp = b.date.localeCompare(a.date);
          if (dateCmp !== 0) return dateCmp;
          return a.startTime.localeCompare(b.startTime);
        }
        if (sortBy === 'duration') return b.duration - a.duration;
        return a.taskName.localeCompare(b.taskName);
      });
    }

    return result;
  }, [entries, searchQuery, filterSync, filterRecoverable, sortBy, activeTab]);

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
            <Label htmlFor="filter-search" className="text-xs">Buscar</Label>
            <Input
              id="filter-search"
              placeholder="Tarea o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48"
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
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo</Label>
            <Select value={filterRecoverable} onValueChange={(v: string) => setFilterRecoverable(v as typeof filterRecoverable)}>
              <SelectTrigger className="w-40 h-10">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="recoverable">Permiso</SelectItem>
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
            onSync={onSync}
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
            onSync={onSync}
            timerEntry={timerEntry}
          />
        )}
      </CardContent>
    </Card>
  );
}
