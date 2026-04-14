import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TimeEntryRow } from './TimeEntryRow';
import type { TimeEntry } from '../types';

interface TimeEntryListProps {
  entries: TimeEntry[];
  selectedIds: Set<string>;
  onSelect: (ids: Set<string>) => void;
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
}

/**
 * Listado de registros de tiempo con filtros y selección.
 */
export function TimeEntryList({ entries, selectedIds, onSelect, onDelete, loading }: TimeEntryListProps) {
  const [filterDate, setFilterDate] = useState('');
  const [filterTask, setFilterTask] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'duration' | 'task'>('date');

  const filtered = useMemo(() => {
    let result = [...entries];
    
    if (filterDate) {
      result = result.filter(e => e.date === filterDate);
    }
    if (filterTask) {
      result = result.filter(e => 
        e.taskName.toLowerCase().includes(filterTask.toLowerCase())
      );
    }
    
    // Sort
    result.sort((a, b) => {
      if (sortBy === 'date') return b.date.localeCompare(a.date);
      if (sortBy === 'duration') return b.duration - a.duration;
      return a.taskName.localeCompare(b.taskName);
    });
    
    return result;
  }, [entries, filterDate, filterTask, sortBy]);

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
    <Card>
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
            <Label className="text-xs">Filtrar por fecha</Label>
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Filtrar por tarea</Label>
            <Input
              placeholder="Buscar tarea..."
              value={filterTask}
              onChange={(e) => setFilterTask(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Ordenar por</Label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'duration' | 'task')}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="date">Fecha</option>
              <option value="duration">Duración</option>
              <option value="task">Tarea</option>
            </select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Cargando registros...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {entries.length === 0 
              ? 'No hay registros de tiempo' 
              : 'No hay registros que coincidan con los filtros'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Tarea</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Fin</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => (
                <TimeEntryRow
                  key={entry.id}
                  entry={entry}
                  selected={selectedIds.has(entry.id)}
                  onToggle={() => toggleSelect(entry.id)}
                  onDelete={() => onDelete(entry.id)}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}