import { useState, useMemo, useCallback } from 'react';
import { ChevronDown, Search, RefreshCw } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useProcessCache } from '../hooks/useProcessCache';
import type { Proceso } from '../types';

const MY_DEPARTMENT_ID = 5;

interface ProcessSelectorButtonProps {
  value: Proceso | null;
  onChange: (task: Proceso | null) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Selector de procesos con popover que muestra:
 * - Búsqueda por nombre, fase, proyecto o cliente
 * - Lista completa de procesos desde el hook useProcessCache
 * - Botón de refresh
 */
export function ProcessSelectorButton({
  value,
  onChange,
  className,
  disabled,
}: ProcessSelectorButtonProps) {
  const { processes, loading, error, refresh } = useProcessCache();
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAllDepartments, setShowAllDepartments] = useState(false);

  // Filter processes: department first, then search text
  const filteredProcesses = useMemo(() => {
    let result = processes;
    if (!showAllDepartments) {
      result = result.filter((p) => p.departamentoId === MY_DEPARTMENT_ID);
    }
    if (searchText) {
      const lower = searchText.toLowerCase();
      result = result.filter(p =>
        p.nombre.toLowerCase().includes(lower) ||
        (p.faseNombre ?? '').toLowerCase().includes(lower) ||
        (p.proyectoNombre ?? '').toLowerCase().includes(lower) ||
        (p.clienteNombre ?? '').toLowerCase().includes(lower)
      );
    }
    return result;
  }, [processes, searchText, showAllDepartments]);

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

        <div className="max-h-[320px] overflow-y-auto">
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground text-center">Cargando...</p>
          ) : error ? (
            <p className="p-4 text-sm text-destructive text-center">{error}</p>
          ) : filteredProcesses.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">
              {searchText ? 'No se encontraron procesos' : 'No hay procesos disponibles'}
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
                  {process.clienteNombre && ` · ${process.clienteNombre}`}
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
