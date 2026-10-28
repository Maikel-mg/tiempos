import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ListTodo, Loader2, RefreshCw, AlertCircle, Plus, Inbox, UploadCloud, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { DataTable, ColumnDef } from '@/components/ui/data-table';
import { SQLPreviewModal } from '@/components/SQLPreviewModal';
import { useCreateProcess } from '@/features/process-management/mutations/useCreateProcess';
import type { CreateProcessDTO } from '@/features/process-management/types';
import { useProcessCache } from '../hooks/useProcessCache';
import { materializeLocalTasks, saveLocalTask } from '../services/localTasksService';
import { useCommandActions } from '@/components/CommandActionsContext';
import { useTableKeyboardNavigation } from '@/hooks/useTableKeyboardNavigation';
import { wizardConfig } from '@/config/stores';
import type { Proceso } from '../types';

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
    cell: ({ row }) => (
      <span className="flex items-center gap-1.5 font-medium">
        {row.getValue('nombre')}
        {row.original.pendiente && (
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            pendiente
          </span>
        )}
      </span>
    ),
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
  const { processes, loading, error, offline, refresh } = useProcessCache();
  const [showAll, setShowAll] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(
    () => Object.fromEntries(columnDefinitions.map((c) => [c.id, c.visible]))
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMaterializing, setIsMaterializing] = useState(false);
  const createProcess = useCreateProcess();
  const tableRef = useRef<HTMLTableElement>(null);

  const pendingProcesses = useMemo(() => processes.filter((p) => p.pendiente), [processes]);

  const filteredProcesses = useMemo(() => {
    if (showAll) return processes;
    return processes.filter((p) => p.departamentoId === MY_DEPARTMENT_ID);
  }, [processes, showAll]);

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

  /**
   * Sin conexión la tarea no se puede crear en la BD: se guarda en local con un id
   * negativo y se materializa más tarde desde "Crear tareas pendientes".
   */
  const handleCreate = useCallback(
    async (dto: CreateProcessDTO) => {
      if (offline) {
        await saveLocalTask(dto);
        await refresh();
        setIsCreateOpen(false);
        toast.success('Tarea guardada en local: se creará en la base de datos al recuperar la conexión');
        return;
      }
      await createProcess.mutateAsync(dto);
    },
    [offline, refresh, createProcess]
  );

  const handleMaterialize = useCallback(async () => {
    setIsMaterializing(true);
    try {
      const result = await materializeLocalTasks();
      await refresh();
      if (result.fallidas.length === 0) {
        toast.success(
          `${result.creadas} tarea(s) creada(s) en la base de datos · ${result.movidos} registro(s) reapuntados`
        );
      } else {
        toast.error(
          `Creadas: ${result.creadas}. Fallaron: ${result.fallidas
            .map((f) => `${f.nombre} (${f.error})`)
            .join('; ')}`
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudieron crear las tareas pendientes');
    } finally {
      setIsMaterializing(false);
    }
  }, [refresh]);

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
        <Button
          size="sm"
          className="ml-auto"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Crear tarea
        </Button>
        {pendingProcesses.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMaterialize}
            disabled={isMaterializing}
            title="Crear en la base de datos las tareas guardadas sin conexión"
          >
            {isMaterializing ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <UploadCloud className="w-4 h-4 mr-1" />
            )}
            Crear tareas pendientes ({pendingProcesses.length})
          </Button>
        )}
      </div>

      {offline && (
        <Alert className="mb-4">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>Sin conexión a la base de datos</AlertTitle>
          <AlertDescription>
            Se muestra la última lista de tareas guardada en este equipo. Puedes crear tareas y
            registrar tiempos: se guardan en local y se crean en la base de datos cuando recuperes la
            conexión (VPN).
          </AlertDescription>
        </Alert>
      )}

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
      ) : processes.length === 0 ? (
        <div className="border border-border/50 rounded-lg p-8">
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-3 bg-muted/50 rounded-full">
              <Inbox className="w-8 h-8 text-muted-foreground/70" />
            </div>
            <div>
              <p className="text-sm font-medium">No hay tareas disponibles</p>
              <p className="text-xs text-muted-foreground mt-1">
                Creá una tarea o ajustá los filtros para ver resultados
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
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
        </div>
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
        onExecute={handleCreate}
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
    </main>
  );
}
