import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeftRight } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { TimeEntryList } from './TimeEntryList';
import { BulkReassignDialog } from './BulkReassignDialog';
import { useBulkReassign } from '../hooks/useBulkReassign';
import { resolvePeriodRange } from '../lib/periodRange';
import type { Proceso, TimeEntry } from '../types';

/** Qué Registros se listan: los del mes en curso o todo el historial de la tarea. */
export type TaskEntriesScope = 'month' | 'all';

interface TaskEntriesDrawerProps {
  /** null = panel cerrado. */
  task: Proceso | null;
  /** Todos los Registros del equipo; el panel filtra los de la tarea. */
  entries: TimeEntry[];
  /** Alcance con el que se abre: el mes en curso, o todo (al fallar un borrado). */
  initialScope: TaskEntriesScope;
  onOpenChange: (open: boolean) => void;
  updateEntry: (id: string, data: Partial<TimeEntry>) => Promise<TimeEntry | null>;
  deleteEntry: (id: string) => Promise<void>;
}

/**
 * Desglose de los Registros de una tarea. Existe para responder "¿de dónde salen
 * estas horas?", sobre todo cuando bloquean el borrado de una tarea local y no se
 * encuentran en la Agenda porque están en otra fecha. Se reutiliza la tabla de
 * Registros, así que también se pueden seleccionar y cambiar de tarea.
 */
export function TaskEntriesDrawer({
  task,
  entries,
  initialScope,
  onOpenChange,
  updateEntry,
  deleteEntry,
}: TaskEntriesDrawerProps) {
  const [scope, setScope] = useState<TaskEntriesScope>(initialScope);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Cada apertura arranca en el alcance que pidió quien la abrió, sin selección.
  useEffect(() => {
    if (!task) return;
    setScope(initialScope);
    setSelectedIds(new Set());
  }, [task, initialScope]);

  const taskEntries = useMemo(
    () =>
      entries
        .filter((e) => e.taskId === task?.proceso)
        .sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`)),
    [entries, task]
  );

  const visibleEntries = useMemo(() => {
    if (scope === 'all') return taskEntries;
    const month = resolvePeriodRange('month');
    return taskEntries.filter((e) => e.date >= month.startStr && e.date <= month.endStr);
  }, [taskEntries, scope]);

  const { reassignOpen, setReassignOpen, reassignableCount, skippedSyncedCount, handleReassign } =
    useBulkReassign({ entries: visibleEntries, selectedIds, setSelectedIds, updateEntry });

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteEntry(id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast('Registro eliminado');
    },
    [deleteEntry]
  );

  return (
    <Sheet open={task !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-5xl">
        <SheetHeader>
          <SheetTitle>Registros de «{task?.nombre}»</SheetTitle>
          <SheetDescription>
            {scope === 'month'
              ? 'Registros del mes en curso. Cambiá a «Todo el historial» si el que buscás es de otra fecha.'
              : 'Todos los registros de esta tarea, en cualquier fecha.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={scope === 'month' ? 'secondary' : 'ghost'}
            onClick={() => setScope('month')}
          >
            Este mes
          </Button>
          <Button
            size="sm"
            variant={scope === 'all' ? 'secondary' : 'ghost'}
            onClick={() => setScope('all')}
          >
            Todo el historial
          </Button>
          <span className="ml-auto text-sm text-muted-foreground tabular-nums">
            {visibleEntries.length} registro(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <TimeEntryList
            entries={visibleEntries}
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
            onDelete={handleDelete}
          />
        </div>

        <div className="mt-auto flex items-center gap-2 border-t border-border/50 pt-3">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size === 0
              ? 'Seleccioná registros para cambiarles la tarea'
              : `${reassignableCount} registro(s) sin sincronizar se pueden cambiar`}
          </span>
          <Button
            className="ml-auto"
            size="sm"
            disabled={reassignableCount === 0}
            onClick={() => setReassignOpen(true)}
          >
            <ArrowLeftRight className="mr-1 h-4 w-4" />
            Cambiar tarea
          </Button>
        </div>
      </SheetContent>

      <BulkReassignDialog
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        count={reassignableCount}
        skippedSyncedCount={skippedSyncedCount}
        onConfirm={handleReassign}
      />
    </Sheet>
  );
}
