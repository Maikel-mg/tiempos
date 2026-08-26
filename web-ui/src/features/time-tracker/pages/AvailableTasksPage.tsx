import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ListTodo, Loader2, RefreshCw, AlertCircle, Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { DataTable, ColumnDef } from '@/components/ui/data-table';
import { SQLPreviewModal } from '@/components/SQLPreviewModal';
import { useCreateProcess } from '@/features/process-management/mutations/useCreateProcess';
import { usePendingProcesses } from '@/features/pending-process/hooks/usePendingProcesses';
import { PendingProcessFormModal } from '@/features/pending-process/components/PendingProcessFormModal';
import { PendingProcessReassignModal } from '@/features/pending-process/components/PendingProcessReassignModal';
import { OfflineTasksEmptyState } from '../components/OfflineTasksEmptyState';
import { useProcessCache } from '../hooks/useProcessCache';
import { useCommandActions } from '@/components/CommandActionsContext';
import { useTableKeyboardNavigation } from '@/hooks/useTableKeyboardNavigation';
import { wizardConfig } from '@/config/stores';
import { timeTrackingService } from '../services/timeTrackingService';
import { findEntriesByPendingProcess, propagateRename } from '../lib/pending-process-links';
import type { Proceso, ProcesoPendiente, TimeEntry } from '../types';

const MY_DEPARTMENT_ID = 5;

const columnDefinitions = [
  { id: 'proceso', label: 'ID', visible: true },
  { id: 'nombre', label: 'Nombre', visible: true },
  { id: 'faseNombre', label: 'Fase', visible: true },
  { id: 'proyectoNombre', label: 'Proyecto', visible: true },
  { id: 'clienteNombre', label: 'Cliente', visible: true },
  { id: 'departamentoNombre', label: 'Departamento', visible: true },
  { id: 'disciplinaId', label: 'Disciplina', visible: true },
];

const columns: ColumnDef<Proceso, any>[] = [
  {
    accessorKey: 'proceso',
    header: 'ID',
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('proceso')}</span>,
  },
  {
    accessorKey: 'nombre',
    header: 'Nombre',
    cell: ({ row }) => <span className="font-medium">{row.getValue('nombre')}</span>,
  },
  {
    accessorKey: 'faseNombre',
    header: 'Fase',
    cell: ({ row }) => <span>{row.getValue('faseNombre') ?? '—'}</span>,
  },
  {
    accessorKey: 'proyectoNombre',
    header: 'Proyecto',
    cell: ({ row }) => <span>{row.getValue('proyectoNombre') ?? '—'}</span>,
  },
  {
    accessorKey: 'clienteNombre',
    header: 'Cliente',
    cell: ({ row }) => <span>{row.getValue('clienteNombre') ?? '—'}</span>,
  },
  {
    accessorKey: 'departamentoNombre',
    header: 'Departamento',
    cell: ({ row }) => <span>{row.getValue('departamentoNombre') ?? '—'}</span>,
  },
  {
    accessorKey: 'disciplinaId',
    header: 'Disciplina',
    cell: ({ row }) => <span>{row.getValue('disciplinaId') ?? '—'}</span>,
  },
];

export function AvailableTasksPage() {
  const { processes, loading, error, refresh } = useProcessCache();
  const { pendingProcesses, reload: reloadPending, remove: removePending } = usePendingProcesses();
  const [showAll, setShowAll] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(
    () => Object.fromEntries(columnDefinitions.map((c) => [c.id, c.visible]))
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPendingCreateOpen, setIsPendingCreateOpen] = useState(false);
  const [editingPending, setEditingPending] = useState<ProcesoPendiente | null>(null);
  const [deletingPending, setDeletingPending] = useState<ProcesoPendiente | null>(null);
  const [localEntries, setLocalEntries] = useState<TimeEntry[]>([]);
  const createProcess = useCreateProcess();
  const tableRef = useRef<HTMLTableElement>(null);

  // Load local time entries once so we can detect linked entries and propagate
  // renames when managing Procesos Pendientes on this page.
  useEffect(() => {
    let cancelled = false;
    void timeTrackingService.getEntries().then((all) => {
      if (!cancelled) setLocalEntries(all);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePendingSaved = useCallback(async (pendiente: ProcesoPendiente) => {
    // Rename propagation: if the name changed, update the taskName of linked
    // entries so the displayed name stays coherent (AC: renombrar propaga).
    if (editingPending && editingPending.nombre !== pendiente.nombre) {
      const affected = propagateRename(localEntries, pendiente.id, pendiente.nombre);
      for (const entry of affected) {
        await timeTrackingService.updateEntry(entry.id, { taskName: pendiente.nombre });
      }
    }
    setEditingPending(null);
    setLocalEntries((prev) => propagateRename(prev, pendiente.id, pendiente.nombre));
    void reloadPending();
    toast.success('Proceso pendiente actualizado');
  }, [editingPending, localEntries, reloadPending]);

  const handlePendingDelete = useCallback(async (pendiente: ProcesoPendiente) => {
    const linked = findEntriesByPendingProcess(localEntries, pendiente.id).filter((e) => !e.synced);
    if (linked.length === 0) {
      await removePending(pendiente.id);
      toast.success('Proceso pendiente eliminado');
      return;
    }
    setDeletingPending(pendiente);
  }, [localEntries, removePending]);

  const handleReassignConfirm = useCallback(async (assignments: { entryId: string; proceso: Proceso }[]) => {
    if (!deletingPending) return;
    for (const { entryId, proceso } of assignments) {
      await timeTrackingService.updateEntry(entryId, {
        taskId: proceso.proceso,
        taskName: proceso.nombre,
        proceso: { ...proceso, esPendiente: false },
      });
    }
    setLocalEntries((prev) =>
      prev.map((e) => {
        const assignment = assignments.find((a) => a.entryId === e.id);
        return assignment ? { ...e, taskId: assignment.proceso.proceso, taskName: assignment.proceso.nombre, proceso: { ...assignment.proceso, esPendiente: false } } : e;
      })
    );
    await removePending(deletingPending.id);
    setDeletingPending(null);
    toast.success('Entradas reasignadas y proceso pendiente eliminado');
  }, [deletingPending, removePending]);

  const filteredProcesses = useMemo(() => {
    if (showAll) return processes;
    return processes.filter((p) => p.esProyectoOffline || p.departamentoId === MY_DEPARTMENT_ID);
  }, [processes, showAll]);

  const hasOfflineTasks = filteredProcesses.length > 0 || pendingProcesses.length > 0;

  const getRowId = useMemo(
    () => (proceso: Proceso) => String(proceso.proceso),
    []
  );

  const { activeIndex, getRowProps, focusFirst } = useTableKeyboardNavigation({
    containerRef: tableRef,
    items: filteredProcesses,
    getRowId: (item) => String(item.proceso),
  });

  // Auto-focus first table row on mount
  useEffect(() => {
    if (filteredProcesses.length === 0) return;
    if (document.activeElement && (
      document.activeElement.tagName === 'INPUT' ||
      document.activeElement.tagName === 'TEXTAREA' ||
      document.activeElement.tagName === 'SELECT' ||
      document.activeElement.getAttribute('contenteditable') === 'true'
    )) return;
    if (document.querySelector('[role="dialog"][data-state="open"]')) return;
    if (document.querySelector('[cmdk-dialog]')) return;
    focusFirst();
  }, [filteredProcesses.length, focusFirst]);

  const handleColumnToggle = useCallback((columnId: string, visible: boolean) => {
    setColumnVisibility((prev) => ({ ...prev, [columnId]: visible }));
  }, []);

  const toggleColumns = useMemo(() => 
    columnDefinitions.map((c) => ({ ...c, visible: columnVisibility[c.id] ?? true })),
    [columnVisibility]
  );

  // Register command palette actions for this page
  const commandActions = useMemo(() => [
    {
      id: 'create-task',
      label: 'Crear tarea',
      icon: <Plus className="h-4 w-4" />,
      action: () => setIsCreateOpen(true),
      group: 'MisTareas',
    },
  ], []);

  useCommandActions('my-tasks', commandActions);

  return (
    <main className="w-full px-4 sm:px-6 lg:px-8 py-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <ListTodo className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mis Tareas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestioná las tareas disponibles para registrar tiempo
          </p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsPendingCreateOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Crear sin conexión
          </Button>
          <Button
            size="sm"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Crear tarea
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-8 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Cargando tareas...</span>
        </div>
      ) : error ? (
        <div className="border border-border/50 rounded-lg p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Alert variant="destructive" className="max-w-md">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error al cargar tareas</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </div>
      ) : !hasOfflineTasks ? (
        <div className="border border-border/50 rounded-lg p-8">
          <OfflineTasksEmptyState />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProcesses.length > 0 && (
            <>
              <div className="flex items-center gap-3">
                <Switch
                  id="department-filter"
                  checked={showAll}
                  onCheckedChange={setShowAll}
                />
                <label htmlFor="department-filter" className="text-sm text-muted-foreground cursor-pointer">
                  {showAll ? 'Todos los departamentos' : 'Mi departamento'}
                </label>
              </div>
              <DataTable
                columns={columns}
                data={filteredProcesses}
                getRowId={getRowId}
                columnToggle={{
                  columns: toggleColumns,
                  onToggle: handleColumnToggle,
                }}
                activeIndex={activeIndex}
                getRowProps={getRowProps}
                tableRef={tableRef}
              />
            </>
          )}
        </div>
      )}

      {pendingProcesses.length > 0 && (
        <section className="mt-6 space-y-3" aria-label="Procesos pendientes">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold tracking-tight">Tus Procesos Pendientes</h2>
            <span className="text-xs text-muted-foreground">
              {pendingProcesses.length} sin sincronizar
            </span>
          </div>
          <div className="rounded-lg border divide-y">
            {pendingProcesses.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.nombre}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    ID provisional {p.id}
                    {p.proyectoNombre ? ` · ${p.proyectoNombre}` : ''}
                    {p.faseNombre ? ` · ${p.faseNombre}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingPending(p)}
                    title="Editar proceso pendiente"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => void handlePendingDelete(p)}
                    title="Eliminar proceso pendiente"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <SQLPreviewModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        taskData={null}
        config={{
          usuario: wizardConfig.get()?.usuario ?? '',
          fase: wizardConfig.get()?.fase ?? '',
        }}
        title="Crear Tarea"
        onExecute={(dto) => createProcess.mutateAsync(dto)}
        isExecuting={createProcess.isPending}
        executeResult={createProcess.data ? {
          success: true,
          message: createProcess.data.message,
          totalRowsAffected: createProcess.data.totalRowsAffected,
        } : createProcess.error ? {
          success: false,
          message: (createProcess.error as Error).message,
        } : null}
      />

      <PendingProcessFormModal
        open={isPendingCreateOpen}
        onOpenChange={setIsPendingCreateOpen}
        onSaved={() => {
          setIsPendingCreateOpen(false);
          void reloadPending();
          toast.success('Proceso pendiente creado');
        }}
      />

      <PendingProcessFormModal
        open={editingPending !== null}
        onOpenChange={(open) => {
          if (!open) setEditingPending(null);
        }}
        initialData={editingPending}
        onSaved={handlePendingSaved}
      />

      <PendingProcessReassignModal
        open={deletingPending !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingPending(null);
        }}
        entries={deletingPending ? findEntriesByPendingProcess(localEntries, deletingPending.id).filter((e) => !e.synced) : []}
        processes={processes}
        pendingNombre={deletingPending?.nombre ?? ''}
        pendingId={deletingPending?.id ?? 0}
        onConfirm={handleReassignConfirm}
      />
    </main>
  );
}
