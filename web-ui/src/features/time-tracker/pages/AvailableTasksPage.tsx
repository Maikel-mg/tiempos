import { useState, useMemo, useCallback } from 'react';
import { ListTodo, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { DataTable, ColumnDef } from '@/components/ui/data-table';
import { useProcessCache } from '../hooks/useProcessCache';
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
  const [showAll, setShowAll] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(
    () => Object.fromEntries(columnDefinitions.map((c) => [c.id, c.visible]))
  );

  const filteredProcesses = useMemo(() => {
    if (showAll) return processes;
    return processes.filter((p) => p.departamentoId === MY_DEPARTMENT_ID);
  }, [processes, showAll]);

  const getRowId = useMemo(
    () => (proceso: Proceso) => String(proceso.proceso),
    []
  );

  const handleColumnToggle = useCallback((columnId: string, visible: boolean) => {
    setColumnVisibility((prev) => ({ ...prev, [columnId]: visible }));
  }, []);

  const toggleColumns = useMemo(() => 
    columnDefinitions.map((c) => ({ ...c, visible: columnVisibility[c.id] ?? true })),
    [columnVisibility]
  );

  return (
    <main className="w-full px-4 sm:px-6 py-5">
      <div className="flex items-center gap-3 mb-6">
        <ListTodo className="w-6 h-6 text-muted-foreground" />
        <h1 className="text-2xl font-semibold tracking-tight">Mis Tareas</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Cargando tareas...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error al cargar tareas</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={refresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
        </div>
      ) : processes.length === 0 ? (
        <p className="text-center p-8 text-muted-foreground">No hay tareas disponibles</p>
      ) : (
        <div className="space-y-4">
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
          />
        </div>
      )}
    </main>
  );
}
