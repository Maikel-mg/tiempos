import { useState, useMemo, useCallback } from 'react';
import { ChevronDown, Search, RefreshCw, Plus, FolderSearch } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProcessSelector } from '@/features/process-management/components/ProcessSelector';
import { useProcessCache } from '../hooks/useProcessCache';
import type { Proceso } from '../types';
import type { Table } from 'dexie';
import type { Project } from '@/features/projects/types';

interface ApiClient {
  post<T>(url: string, data?: unknown): Promise<T>;
}

interface ProcessCacheDB {
  table(name: string): Table;
}

interface ProcessSelectorButtonProps {
  value: Proceso | null;
  onChange: (task: Proceso | null) => void;
  db: ProcessCacheDB;
  apiClient: ApiClient;
  className?: string;
  disabled?: boolean;
  onCreateNew?: () => void;
}

/**
 * Selector de procesos con popover que muestra:
 * - Recientes (top 10)
 * - Todos (con búsqueda por nombre, fase, proyecto)
 * - Botón "Buscar" que abre el ProcessSelector completo
 * - Botón "+ Crear nuevo"
 */
export function ProcessSelectorButton({
  value,
  onChange,
  db,
  apiClient,
  className,
  disabled,
  onCreateNew,
}: ProcessSelectorButtonProps) {
  const { processes, loading, getRecent, refresh, markUsed } = useProcessCache(db, apiClient);
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [recentProcesses, setRecentProcesses] = useState<Proceso[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);

  // Load recent processes when popover opens
  const handleOpenChange = useCallback(async (isOpen: boolean) => {
    if (disabled) return;
    setOpen(isOpen);
    if (isOpen) {
      const recent = await getRecent(10);
      setRecentProcesses(recent);
    } else {
      setSearchText('');
    }
  }, [disabled, getRecent]);

  // Filter processes based on search text
  const filteredProcesses = useMemo(() => {
    if (!searchText) return processes;
    const lower = searchText.toLowerCase();
    return processes.filter(p =>
      p.nombre.toLowerCase().includes(lower) ||
      (p.faseNombre ?? '').toLowerCase().includes(lower) ||
      (p.proyectoNombre ?? '').toLowerCase().includes(lower)
    );
  }, [processes, searchText]);

  // Handle process selection from the cached list
  const handleSelect = useCallback(async (process: Proceso) => {
    await markUsed(process);
    onChange(process);
    setOpen(false);
    setSearchText('');
  }, [markUsed, onChange]);

  // Handle process selection from the ProcessSelector dialog
  const handleSelectorSelect = useCallback(async (projectCode: string, processId: string) => {
    // ProcessSelector returns (projectCode, processId as string)
    // We need to construct a Proceso from the available data
    // The ProcessSelector dialog has the full process info internally,
    // but its onSelect only gives us projectCode and processId.
    // We'll construct a minimal Proceso — the user can refine it later.
    const proceso: Proceso = {
      proceso: parseInt(processId, 10),
      nombre: `Proceso ${processId}`,
    };

    await markUsed(proceso);
    onChange(proceso);
    setSelectorOpen(false);
    setOpen(false);
  }, [markUsed, onChange]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refresh();
      const recent = await getRecent(10);
      setRecentProcesses(recent);
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh, getRecent]);

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
        <PopoverContent className="w-[360px] p-0" align="start">
          {/* Header with refresh */}
          <div className="flex items-center justify-between p-2 border-b">
            <span className="text-sm font-medium text-muted-foreground px-2">Procesos</span>
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
                placeholder="Buscar por nombre, fase o proyecto..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {loading ? (
              <p className="p-4 text-sm text-muted-foreground text-center">Cargando...</p>
            ) : (
              <>
                {/* Recientes section */}
                {!searchText && recentProcesses.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">
                      Recientes
                    </div>
                    {recentProcesses.map((process) => (
                      <button
                        key={`recent-${process.proceso}`}
                        className="w-full px-3 py-2 text-left hover:bg-muted transition-colors flex flex-col gap-0.5"
                        onClick={() => handleSelect(process)}
                      >
                        <span className="font-medium truncate">{process.nombre}</span>
                        <span className="text-xs text-muted-foreground">
                          {process.faseNombre && `${process.faseNombre}`}
                          {process.faseNombre && process.proyectoNombre && ' · '}
                          {process.proyectoNombre && `${process.proyectoNombre}`}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Todos section */}
                <div>
                  <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">
                    Todos
                  </div>
                  {filteredProcesses.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground text-center">
                      {searchText ? 'No se encontraron procesos' : 'No hay procesos cacheados'}
                    </p>
                  ) : (
                    filteredProcesses.map((process) => (
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
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer buttons */}
          <div className="border-t p-2 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 justify-start gap-2"
              onClick={() => {
                setOpen(false);
                setSelectorOpen(true);
              }}
            >
              <FolderSearch className="w-4 h-4" />
              Buscar en proyectos
            </Button>
            {onCreateNew && (
              <Button
                variant="ghost"
                className="justify-start gap-2"
                onClick={() => {
                  setOpen(false);
                  onCreateNew();
                }}
              >
                <Plus className="w-4 h-4" />
                Crear
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Full ProcessSelector dialog for finding processes by project */}
      <ProcessSelector
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        onSelect={handleSelectorSelect}
      />
    </>
  );
}
