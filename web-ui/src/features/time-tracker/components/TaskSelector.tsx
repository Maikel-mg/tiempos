import { useState, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTasksWithSampleData } from '../hooks/useTasks';
import type { Proceso } from '../types';

interface TaskSelectorProps {
  value: Proceso | null;
  onChange: (task: Proceso | null) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Componente selector de tareas con búsqueda.
 * Muestra un dropdown con las tareas disponibles.
 */
export function TaskSelector({ value, onChange, className, disabled }: TaskSelectorProps) {
  const { tasks, loading } = useTasksWithSampleData();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return tasks;
    const lower = search.toLowerCase();
    return tasks.filter(t =>
      t.nombre.toLowerCase().includes(lower) ||
      String(t.proceso).includes(lower)
    );
  }, [tasks, search]);

  const handleSelect = (task: Proceso) => {
    onChange(task);
    setOpen(false);
    setSearch('');
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!disabled) {
      setOpen(isOpen);
    }
  };

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
            <span className="text-muted-foreground">Seleccionar tarea...</span>
          )}
          <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tarea..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-[240px] overflow-y-auto">
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground text-center">Cargando...</p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">
              {search ? 'No se encontraron tareas' : 'No hay tareas disponibles'}
            </p>
          ) : (
            filtered.map((task) => (
              <button
                key={task.proceso}
                className="w-full px-3 py-2.5 text-left hover:bg-muted transition-colors border-b border-transparent hover:border-border/50"
                onClick={() => handleSelect(task)}
              >
                <div className="font-medium truncate">{task.nombre}</div>
                <div className="text-xs text-muted-foreground">ID: {task.proceso}</div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
