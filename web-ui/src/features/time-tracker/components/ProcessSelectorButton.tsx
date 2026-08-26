import { useState, useMemo, useCallback } from 'react';
import { ChevronDown, Search, RefreshCw, Plus, AlertTriangle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useProcessCache } from '../hooks/useProcessCache';
import { useOfflineFirstExperience } from '../hooks/useOfflineFirstExperience';
import { usePendingProcesses } from '@/features/pending-process/hooks/usePendingProcesses';
import { PendingProcessFormModal } from '@/features/pending-process/components/PendingProcessFormModal';
import { OfflineTasksEmptyState } from './OfflineTasksEmptyState';
import type { Proceso } from '../types';

const MY_DEPARTMENT_ID = 5;

export interface ProcessSelectorButtonProps {
  value: Proceso | null;
  onChange: (task: Proceso | null) => void;
  className?: string;
  disabled?: boolean;
  /** True while editing an unsynchronized Entrada de Tiempo. */
  entryPending?: boolean;
}

function matchesSearch(p: Proceso, lower: string): boolean {
  return (
    p.nombre.toLowerCase().includes(lower) ||
    (p.faseNombre ?? '').toLowerCase().includes(lower) ||
    (p.proyectoNombre ?? '').toLowerCase().includes(lower) ||
    (p.clienteNombre ?? '').toLowerCase().includes(lower)
  );
}

/**
 * Selector de procesos con popover que muestra:
 * - Búsqueda por nombre, fase, proyecto o cliente
 * - Procesos pendientes (ID provisional negativo) SIEMPRE visibles, marcados
 *   con un badge "Pendiente", y procesos del sistema (filtro departamento)
 * - Botón de refresh y de creación de un Proceso Pendiente sin conexión
 */
export function ProcessSelectorButton({
  value,
  onChange,
  className,
  disabled,
  entryPending = false,
}: ProcessSelectorButtonProps) {
  const { processes, loading, error, refresh } = useProcessCache();
  const { pendingProcesos, loading: pendingLoading, reload: reloadPending } = usePendingProcesses();
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAllDepartments, setShowAllDepartments] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const firstExperienceSuggestion = useOfflineFirstExperience({
    open,
    hasTasks: processes.length > 0 || pendingProcesos.length > 0,
    loading: loading || pendingLoading,
  });

  // Filter system processes: department first, then search text.
  // Pending processes have no department, so they are always visible.
  const filteredProcesses = useMemo(() => {
    let result = processes;
    if (!showAllDepartments) {
      result = result.filter((p) => p.esProyectoOffline || p.departamentoId === MY_DEPARTMENT_ID);
    }
    if (searchText) {
      const lower = searchText.toLowerCase();
      result = result.filter((p) => matchesSearch(p, lower));
    }
    return result;
  }, [processes, searchText, showAllDepartments]);

  const visiblePending = useMemo(() => {
    if (!searchText) return pendingProcesos;
    const lower = searchText.toLowerCase();
    return pendingProcesos.filter((p) => matchesSearch(p, lower));
  }, [pendingProcesos, searchText]);

  const missingSelectedProcess = Boolean(
    entryPending &&
      value &&
      value.proceso > 0 &&
      !loading &&
      !processes.some((process) => process.proceso === value.proceso)
  );

  // Handle process selection
  const handleSelect = useCallback((process: Proceso) => {
    onChange(process);
    setOpen(false);
    setSearchText('');
  }, [onChange]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  // Handle open/close
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (disabled) return;
    setOpen(isOpen);
    if (!isOpen) {
      setSearchText('');
    }
  }, [disabled]);

  return (
    <>
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`justify-between ${className}`}
          disabled={disabled}
        >
          {value ? (
            <span className="truncate">{value.nombre}</span>
          ) : (
            <span className="text-muted-foreground">Seleccionar proceso...</span>
          )}
          <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[480px] p-0" align="start">
        {/* Header with department filter and refresh */}
        <div className="flex items-center justify-between p-2 border-b">
          <div className="flex items-center gap-2 px-2">
            <Switch
              id="dept-filter-popover"
              checked={showAllDepartments}
              onCheckedChange={setShowAllDepartments}
              className="scale-75 origin-left"
            />
            <label htmlFor="dept-filter-popover" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
              {showAllDepartments ? 'Todos' : 'Mi dpto'}
            </label>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Actualizar lista"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Search input */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, fase, proyecto o cliente..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        </div>

        {missingSelectedProcess && value && (
          <Alert variant="warning" className="m-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Proceso no disponible offline</AlertTitle>
            <AlertDescription>
              El proceso &quot;{value.nombre}&quot; ya no está disponible offline. Selecciona otro proceso para
              reasignar la Entrada de Tiempo.
            </AlertDescription>
          </Alert>
        )}

        <div className="max-h-[320px] overflow-y-auto">
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground text-center">Cargando...</p>
          ) : error ? (
            <p className="p-4 text-sm text-destructive text-center">{error}</p>
          ) : visiblePending.length === 0 && filteredProcesses.length === 0 ? (
            searchText ? (
              <p className="p-4 text-sm text-muted-foreground text-center">No se encontraron procesos</p>
            ) : (
              <OfflineTasksEmptyState firstExperience={firstExperienceSuggestion} />
            )
          ) : (
            <>
              {visiblePending.map((process) => (
                <button
                  key={process.proceso}
                  className="w-full px-3 py-2 text-left hover:bg-muted transition-colors flex flex-col gap-0.5"
                  onClick={() => handleSelect(process)}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-medium truncate">{process.nombre}</span>
                    <Badge variant="warning" className="shrink-0">Pendiente</Badge>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ID provisional: {process.proceso}
                    {process.faseNombre && ` · ${process.faseNombre}`}
                    {process.proyectoNombre && ` · ${process.proyectoNombre}`}
                    {process.clienteNombre && ` · ${process.clienteNombre}`}
                  </span>
                </button>
              ))}
              {visiblePending.length > 0 && filteredProcesses.length > 0 && (
                <div className="px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  Procesos del sistema
                </div>
              )}
              {filteredProcesses.map((process) => (
                <button
                  key={process.proceso}
                  className="w-full px-3 py-2 text-left hover:bg-muted transition-colors flex flex-col gap-0.5"
                  onClick={() => handleSelect(process)}
                >
                  <span className="font-medium truncate">{process.nombre}</span>
                  <span className="text-xs text-muted-foreground">
                    ID: {process.proceso}
                    {process.faseNombre && ` · ${process.faseNombre}`}
                    {process.proyectoNombre && ` · ${process.proyectoNombre}`}
                    {process.clienteNombre && ` · ${process.clienteNombre}`}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Footer: create pending process */}
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-primary"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Crear proceso sin conexión
          </Button>
        </div>
      </PopoverContent>
    </Popover>

    <PendingProcessFormModal
      open={createOpen}
      onOpenChange={setCreateOpen}
      onSaved={() => {
        setCreateOpen(false);
        void reloadPending();
      }}
    />
    </>
  );
}
