import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TimeEntryRow } from './TimeEntryRow';
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

interface TimeEntryListProps {
  entries: TimeEntry[];
  selectedIds: Set<string>;
  onSelect: (ids: Set<string>) => void;
  onDelete: (id: string) => Promise<void>;
  onEdit?: (entry: TimeEntry) => void;
  onPlay?: (entry: TimeEntry) => void;
  onDuplicate?: (entry: TimeEntry) => void;
  loading?: boolean;
  timerEntry?: TimerEntryData | null;
}

/**
 * Listado de registros de tiempo con selección.
 * Los filtros son manejados por TimeEntryViewSwitcher.
 */
export function TimeEntryList({ entries, selectedIds, onSelect, onDelete, onEdit, onPlay, onDuplicate, loading, timerEntry }: TimeEntryListProps) {
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    onSelect(newSet);
  };

  return (
    <>
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
          ))}
        </div>
      ) : entries.length === 0 && !timerEntry ? (
        <div className="text-center py-8 text-muted-foreground">
          No hay registros que coincidan con los filtros
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Tarea</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Duración</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {timerEntry && (
              <TimerRow {...timerEntry} />
            )}
            {entries.map((entry) => (
              <TimeEntryRow
                key={entry.id}
                entry={entry}
                selected={selectedIds.has(entry.id)}
                onToggle={() => toggleSelect(entry.id)}
                onDelete={() => onDelete(entry.id)}
                onEdit={onEdit ? () => onEdit(entry) : undefined}
                onPlay={onPlay ? () => onPlay(entry) : undefined}
                onDuplicate={onDuplicate ? () => onDuplicate(entry) : undefined}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}
