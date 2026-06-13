import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { copyToClipboard, parseISO8601DurationToMinutes } from '@/lib/sql-utils';
import { saveMappings } from '@/lib/task-mapping-storage';
import { calculateHours } from '@/lib/utils';
import { Edit2, Check, AlertCircle, FileCode, Search, ChevronDown, ChevronUp } from 'lucide-react';

export interface TaskMappingTableProps {
    entries: any[];
    taskMapping: Record<string, string>;
    onUpdateTaskId: (taskName: string, taskId: string) => void;
    config: {
        usuario: string;
        fase: string;
        tipoHora: string;
    };
    dbConfig: any;
}

export function TaskMappingTable({ 
    entries, 
    taskMapping, 
    onUpdateTaskId, 
    config: _config,
}: TaskMappingTableProps) {
    const [localErrors, setLocalErrors] = useState<Record<string, string | null>>({});
    const [copiedTask, setCopiedTask] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
    const [isExpanded, setIsExpanded] = useState(true);

    // Extract unique tasks from entries with their date ranges
    const tasksWithDates = useMemo(() => {
        const taskMap: Record<string, any> = {};
        
        entries.forEach(entry => {
            const taskName = entry.taskName || entry.task?.name;
            if (!taskName) return;
            
            if (!taskMap[taskName]) {
                taskMap[taskName] = {
                    name: taskName,
                    fechaInicio: entry.timeInterval?.start,
                    fechaFin: entry.timeInterval?.end,
                    totalMinutes: 0
                };
            }
            
            const duration = entry.timeInterval?.duration;
            if (typeof duration === 'number') {
                taskMap[taskName].totalMinutes += duration / 60;
            } else if (typeof duration === 'string') {
                const parsed = parseISO8601DurationToMinutes(duration);
                taskMap[taskName].totalMinutes += parsed;
            }
            
            if (new Date(entry.timeInterval?.start) < new Date(taskMap[taskName].fechaInicio)) {
                taskMap[taskName].fechaInicio = entry.timeInterval?.start;
            }
            if (new Date(entry.timeInterval?.end) > new Date(taskMap[taskName].fechaFin)) {
                taskMap[taskName].fechaFin = entry.timeInterval?.end;
            }
        });
        
        return Object.values(taskMap).sort((a, b) => a.name.localeCompare(b.name));
    }, [entries]);

    const mappedTaskCount = useMemo(() => {
        return tasksWithDates.filter(task => {
            const id = taskMapping[task.name];
            return id && /^[1-9]\d*$/.test(id);
        }).length;
    }, [tasksWithDates, taskMapping]);

    const unassignedCount = tasksWithDates.length - mappedTaskCount;
    const allAssigned = unassignedCount === 0;

    // Set initial expanded state based on whether there are unassigned tasks
    const initialExpanded = useMemo(() => {
        return !allAssigned;
    }, [allAssigned]);

    const [isInitialized, setIsInitialized] = useState(false);

    useMemo(() => {
        if (!isInitialized) {
            setIsExpanded(initialExpanded);
            setIsInitialized(true);
        }
    }, [initialExpanded, isInitialized]);

    const filteredTasks = useMemo(() => {
        let filtered = tasksWithDates;
        
        // Apply filter
        if (filter === 'assigned') {
            filtered = filtered.filter(task => {
                const id = taskMapping[task.name];
                return id && /^[1-9]\d*$/.test(id);
            });
        } else if (filter === 'unassigned') {
            filtered = filtered.filter(task => {
                const id = taskMapping[task.name];
                return !id || !/^[1-9]\d*$/.test(id);
            });
        }
        
        // Apply search
        if (searchTerm) {
            filtered = filtered.filter(task =>
                task.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        return filtered;
    }, [tasksWithDates, taskMapping, filter, searchTerm]);

    const validateTaskId = (value: string) => {
        if (!value || value.trim() === '') {
            return { valid: false, error: 'Requerido' };
        }
        if (!/^[1-9]\d*$/.test(value)) {
            return { valid: false, error: 'Debe ser un número entero positivo' };
        }
        return { valid: true, error: null };
    };

    const handleIdChange = (taskName: string, value: string) => {
        onUpdateTaskId(taskName, value);
        
        if (value) {
            const validation = validateTaskId(value);
            setLocalErrors(prev => ({
                ...prev,
                [taskName]: validation.error
            }));
            
            if (validation.valid) {
                saveMappings({ [taskName]: value });
            }
        } else {
            setLocalErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[taskName];
                return newErrors;
            });
        }
    };

    const formatDateDDMMYYYY = (dateString: string | undefined | null): string => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const handleCopyTaskSQL = async (task: any) => {
        const sql = '-- SQL generation moved to backend. Use the preview endpoint.';
        
        const success = await copyToClipboard(sql);
        if (success) {
            setCopiedTask(task.name);
            setTimeout(() => setCopiedTask(null), 2000);
        }
    };

    const FilterButton = ({ type, label, count }: { type: 'all' | 'assigned' | 'unassigned', label: string, count: number }) => (
        <button
            onClick={() => setFilter(type)}
            className={`
                px-3 py-1 text-sm rounded-md transition-colors
                ${filter === type 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'}
            `}
        >
            {label} ({count})
        </button>
    );

    return (
        <Card>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full"
            >
                <CardHeader className="py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {isExpanded ? (
                                <ChevronUp className="w-5 h-5" />
                            ) : (
                                <ChevronDown className="w-5 h-5" />
                            )}
                            <div className="text-left">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Edit2 className="w-5 h-5" />
                                    Asignar IDs de Tareas
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    {allAssigned 
                                        ? 'Todas las tareas tienen ID asignado' 
                                        : `${unassignedCount} tarea(s) sin asignar`}
                                </CardDescription>
                            </div>
                        </div>
                        <Badge variant={allAssigned ? "success" : "destructive"}>
                            {mappedTaskCount}/{tasksWithDates.length} tareas
                        </Badge>
                    </div>
                </CardHeader>
            </button>
            
            {isExpanded && (
                <CardContent className="space-y-4 pt-0">
                    <div className="flex items-center gap-3 pt-4">
                        <div className="relative flex-1 max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar tareas..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 h-9"
                            />
                        </div>
                        <div className="flex gap-1 bg-muted p-1 rounded-lg">
                            <FilterButton type="all" label="Todas" count={tasksWithDates.length} />
                            <FilterButton type="unassigned" label="Sin asignar" count={unassignedCount} />
                            <FilterButton type="assigned" label="Asignadas" count={mappedTaskCount} />
                        </div>
                    </div>
                    
                    <ScrollArea className="h-[400px] border rounded-lg">
                        <Table>
                            <TableHeader className="sticky top-0 bg-background z-10">
                                <TableRow>
                                    <TableHead className="min-w-[300px]">Nombre de Tarea</TableHead>
                                    <TableHead className="w-[100px]">Fecha Inicio</TableHead>
                                    <TableHead className="w-[100px]">Fecha Fin</TableHead>
                                    <TableHead className="w-[80px]">Horas</TableHead>
                                    <TableHead className="w-[140px]">ID de Proceso</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTasks.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No hay tareas que mostrar con el filtro actual
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredTasks.map((task, index) => {
                                        const id = taskMapping[task.name] || '';
                                        const hasError = localErrors[task.name];
                                        const isValid = id && /^[1-9]\d*$/.test(id);
                                        const fechaIni = formatDateDDMMYYYY(task.fechaInicio);
                                        const fechaFin = formatDateDDMMYYYY(task.fechaFin);

                                        return (
                                            <TableRow key={index} className={!isValid ? 'bg-yellow-50/50' : ''}>
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        {isValid ? (
                                                            <Check className="w-4 h-4 text-green-500 shrink-0" />
                                                        ) : (
                                                            <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0" />
                                                        )}
                                                        <span className="truncate" title={task.name}>
                                                            {task.name}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {fechaIni || '-'}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {fechaFin || '-'}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm font-medium">
                                                    {(() => {
                                                        const hours = calculateHours(fechaIni, fechaFin);
                                                        return hours !== null ? `${hours}h` : '-';
                                                    })()}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                type="text"
                                                                value={id}
                                                                onChange={(e) => handleIdChange(task.name, e.target.value)}
                                                                placeholder="Ej: 123"
                                                                className={`
                                                                    w-24 text-center h-8
                                                                    ${hasError ? 'border-destructive focus-visible:ring-destructive' : ''}
                                                                    ${isValid ? 'border-green-500 focus-visible:ring-green-500' : ''}
                                                                `}
                                                            />
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                                onClick={() => handleCopyTaskSQL(task)}
                                                                title={copiedTask === task.name ? '¡SQL Copiado!' : 'Copiar SQL de Creación'}
                                                            >
                                                                {copiedTask === task.name ? (
                                                                    <Check className="w-4 h-4 text-green-500" />
                                                                ) : (
                                                                    <FileCode className="w-4 h-4" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                        {hasError && (
                                                            <p className="text-xs text-destructive">
                                                                {hasError}
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            )}
        </Card>
    );
}
