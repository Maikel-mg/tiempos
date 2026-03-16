import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateTaskSQL, copyToClipboard } from '@/lib/sql-generator';
import { saveMappings } from '@/lib/task-mapping-storage';
import { Edit2, Copy, Check, AlertCircle, FileCode } from 'lucide-react';

export function TaskMappingTable({ 
    entries, 
    taskMapping, 
    onUpdateTaskId, 
    config,
    dbConfig 
}) {
    const [localErrors, setLocalErrors] = useState({});
    const [copiedTask, setCopiedTask] = useState(null);

    // Extract unique tasks from entries with their date ranges
    const tasksWithDates = useMemo(() => {
        const taskMap = {};
        
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
        
        return Object.values(taskMap);
    }, [entries]);

    // Filter tasks that don't have ID assigned
    const unmappedTasks = useMemo(() => {
        return tasksWithDates.filter(task => {
            const id = taskMapping[task.name];
            return !id || !/^[1-9]\d*$/.test(id);
        });
    }, [tasksWithDates, taskMapping]);

    const mappedTaskCount = tasksWithDates.length - unmappedTasks.length;

    const validateTaskId = (value) => {
        if (!value || value.trim() === '') {
            return { valid: false, error: 'Requerido' };
        }
        if (!/^[1-9]\d*$/.test(value)) {
            return { valid: false, error: 'Debe ser un número entero positivo' };
        }
        return { valid: true, error: null };
    };

    const handleIdChange = (taskName, value) => {
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

    const handleCopyTaskSQL = async (task) => {
        const sql = generateTaskSQL({
            nombre: task.name,
            fechaInicio: task.fechaInicio,
            fechaFin: task.fechaFin,
            minutos: Math.ceil(task.totalMinutes),
            usuario: config.usuario,
            fase: config.fase
        });
        
        const success = await copyToClipboard(sql);
        if (success) {
            setCopiedTask(task.name);
            setTimeout(() => setCopiedTask(null), 2000);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES');
    };

    if (unmappedTasks.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-yellow-500" />
                            Tareas sin asignar ID
                        </CardTitle>
                        <CardDescription>
                            Estas tareas de Clockify no tienen un ID de proceso asignado. 
                            Asigna un ID o genera el SQL de creación.
                        </CardDescription>
                    </div>
                    <Badge variant="secondary">
                        {mappedTaskCount}/{tasksWithDates.length} tareas asignadas
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                        {unmappedTasks.map((task, index) => (
                            <div 
                                key={task.name} 
                                className="flex items-center gap-4 p-3 border rounded-lg bg-yellow-50/50"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate" title={task.name}>
                                        {task.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDate(task.fechaInicio)} - {formatDate(task.fechaFin)} 
                                        ({Math.round(task.totalMinutes)} min)
                                    </p>
                                </div>
                                <div className="w-32">
                                    <Input
                                        type="number"
                                        placeholder="ID Proceso"
                                        value={taskMapping[task.name] || ''}
                                        onChange={(e) => handleIdChange(task.name, e.target.value)}
                                        className={localErrors[task.name] ? 'border-red-500' : ''}
                                    />
                                    {localErrors[task.name] && (
                                        <p className="text-xs text-red-500 mt-1">
                                            {localErrors[task.name]}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCopyTaskSQL(task)}
                                >
                                    {copiedTask === task.name ? (
                                        <Check className="w-4 h-4 mr-1" />
                                    ) : (
                                        <FileCode className="w-4 h-4 mr-1" />
                                    )}
                                    {copiedTask === task.name ? 'Copiado' : 'SQL Creación'}
                                </Button>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

function parseISO8601Duration(durationString) {
    if (!durationString) return 0;
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const match = durationString.match(regex);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    
    return hours * 60 + minutes + Math.ceil(seconds / 60);
}
