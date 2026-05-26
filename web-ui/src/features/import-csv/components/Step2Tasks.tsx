import { useState, useMemo } from 'react';
import { ArrowRight, ArrowLeft, AlertCircle, Check, Search, Edit2, Eye } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { calculateHours } from '@/lib/utils';
import { CSVPreviewModal } from './CSVPreviewModal';
import { SQLPreviewModal } from '@/components/SQLPreviewModal';
import type { UniqueTask, ParsedData } from '../services/csv-parser';

export interface Step2TasksProps {
    tasks: UniqueTask[];
    taskMapping: Record<string, string>;
    suggestedTasks: Record<string, boolean>;
    onUpdateTaskId: (taskName: string, taskId: string) => void;
    onGenerateSQL: () => void;
    onBack: () => void;
    isLoading: boolean;
    error: string | null;
    totalRows: number;
    mappedTaskCount: number;
    csvData: ParsedData | null;
    selectedRows: number[];
    setSelectedRows: (rows: number[]) => void;
    config: {
        usuario: string;
        fase: string;
        tipoHora: string;
    };
    dbConfig: any;
}

export function Step2Tasks({
    tasks,
    taskMapping,
    suggestedTasks,
    onUpdateTaskId,
    onGenerateSQL,
    onBack,
    isLoading,
    error,
    totalRows,
    mappedTaskCount,
    csvData,
    selectedRows,
    setSelectedRows,
    config,
    dbConfig
}: Step2TasksProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [localErrors, setLocalErrors] = useState<Record<string, string | null>>({});
    const [previewOpen, setPreviewOpen] = useState(false);
    const [sqlPreviewOpen, setSqlPreviewOpen] = useState(false);
    const [selectedTaskData, setSelectedTaskData] = useState<UniqueTask | null>(null);
    const [selectedTaskName, setSelectedTaskName] = useState('');
    const copiedTask = null;
    const [isExecuting, setIsExecuting] = useState(false);
    const [executeResult, setExecuteResult] = useState<any>(null);



    const handlePreviewTaskSQL = (task: UniqueTask) => {
        setSelectedTaskData(task);
        setSelectedTaskName(task.name);
        setExecuteResult(null);
        setSqlPreviewOpen(true);
    };

    const handleExecuteSQL = async (sqlToExecute: string) => {
        if (!dbConfig.server || !dbConfig.database || !dbConfig.username) {
            setExecuteResult({
                success: false,
                message: 'Configura la conexión a la base de datos primero'
            });
            return;
        }

        setIsExecuting(true);
        setExecuteResult(null);

        try {
            const response = await fetch('http://localhost:3001/api/execute-sql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    server: dbConfig.server,
                    database: dbConfig.database,
                    username: dbConfig.username,
                    password: dbConfig.password,
                    sqlStatements: [sqlToExecute]
                })
            });

            const data = await response.json();
            setExecuteResult(data);
        } catch (error: any) {
            setExecuteResult({
                success: false,
                message: `Error: ${error.message}`
            });
        } finally {
            setIsExecuting(false);
        }
    };

  // Filter tasks based on search
  const filteredTasks = useMemo(() => {
    if (!searchTerm) return tasks;
    return tasks.filter(task =>
      task.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tasks, searchTerm]);

    // Calculate progress
    const progress = tasks.length > 0 ? (mappedTaskCount / tasks.length) * 100 : 0;

    // Validate single task ID
    const validateTaskId = (value: string) => {
        if (!value || value.trim() === '') {
            return { valid: false, error: 'Requerido' };
        }
        if (!/^[1-9]\d*$/.test(value)) {
            return { valid: false, error: 'Debe ser un número entero positivo' };
        }
        return { valid: true, error: null };
    };

    // Handle ID change with validation
    const handleIdChange = (taskName: string, value: string) => {
        onUpdateTaskId(taskName, value);
        
        if (value) {
            const validation = validateTaskId(value);
            setLocalErrors(prev => ({
                ...prev,
                [taskName]: validation.error
            }));
        } else {
            setLocalErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[taskName];
                return newErrors;
            });
        }
    };

  // Check if all tasks are valid
  const allTasksValid = useMemo(() => {
    if (tasks.length === 0) return false;
    return tasks.every(task => {
      const id = taskMapping[task.name];
      return id && /^[1-9]\d*$/.test(id);
    });
  }, [tasks, taskMapping]);

  // Get validation errors for display
  const validationErrors = useMemo(() => {
    const errors: { task: string; error: string }[] = [];
    tasks.forEach(task => {
      const id = taskMapping[task.name];
      if (!id || id.trim() === '') {
        errors.push({ task: task.name.substring(0, 40) + (task.name.length > 40 ? '...' : ''), error: 'Sin ID' });
      } else if (!/^[1-9]\d*$/.test(id)) {
        errors.push({ task: task.name.substring(0, 40) + (task.name.length > 40 ? '...' : ''), error: 'ID inválido' });
      }
    });
    return errors.slice(0, 5); // Show only first 5
  }, [tasks, taskMapping]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Edit2 className="w-5 h-5" />
                                Asignar IDs de Tareas
                            </CardTitle>
                            <CardDescription>
                                Asigna un ID de proceso numérico a cada tarea encontrada en el CSV
                            </CardDescription>
                        </div>
                        <Badge variant={allTasksValid ? "success" : "secondary"}>
                            {mappedTaskCount}/{tasks.length} tareas
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Progress */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progreso</span>
                            <span className="font-medium">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} />
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <p className="text-2xl font-bold">{tasks.length}</p>
                            <p className="text-xs text-muted-foreground">Tareas únicas</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <p className="text-2xl font-bold">{totalRows}</p>
                            <p className="text-xs text-muted-foreground">Registros CSV</p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar tareas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="w-4 h-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Validation Errors */}
                    {validationErrors.length > 0 && !error && (
                        <Alert variant="warning">
                            <AlertCircle className="w-4 h-4" />
                            <AlertTitle>Tareas pendientes</AlertTitle>
                            <AlertDescription>
                                <ul className="mt-2 space-y-1 text-sm">
                                    {validationErrors.map((err, idx) => (
                                        <li key={idx} className="flex items-center gap-2">
                                            <span className="truncate flex-1">{err.task}</span>
                                            <Badge variant="destructive" className="text-xs">
                                                {err.error}
                                            </Badge>
                                        </li>
                                    ))}
                                    {tasks.length > 5 && validationErrors.length >= 5 && (
                                        <li className="text-muted-foreground italic">
                                            ... y {tasks.length - 5} más
                                        </li>
                                    )}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}

{/* Tasks Table */}
        <ScrollArea className="h-[500px] border rounded-lg">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="min-w-[400px]">Nombre de Tarea</TableHead>
                <TableHead className="w-[120px]">Fecha Inicio</TableHead>
                <TableHead className="w-[120px]">Fecha Fin</TableHead>
                <TableHead className="w-[100px]">Horas</TableHead>
                <TableHead className="w-[150px]">ID de Proceso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.map((task, index) => {
                const id = taskMapping[task.name] || '';
                const hasError = localErrors[task.name];
                const isValid = id && /^[1-9]\d*$/.test(id);

                return (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2 min-w-0">
                        {isValid ? (
                          <Check className="w-4 h-4 text-green-500 shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-muted shrink-0" />
                        )}
                        <span
                          className="truncate"
                          title={task.name}
                        >
                          {task.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {task.fechaInicio || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {task.fechaFin || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-medium">
                      {(() => {
                        const hours = calculateHours(task.fechaInicio, task.fechaFin);
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
                              w-24 text-center
                              ${hasError ? 'border-destructive focus-visible:ring-destructive' : ''}
                              ${isValid ? 'border-green-500 focus-visible:ring-green-500' : ''}
                            `}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => handlePreviewTaskSQL(task)}
                            title={copiedTask === task.name ? '¡SQL Copiado!' : 'Vista previa SQL'}
                          >
                            {copiedTask === task.name ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>

                          {isValid && (
                            <Check className="w-4 h-4 text-green-500" />
                          )}
                          {hasError && (
                            <AlertCircle className="w-4 h-4 text-destructive" />
                          )}
                        </div>
                        {suggestedTasks[task.name] && isValid && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                            Sugerido
                          </span>
                        )}
                      </div>
                      {hasError && (
                        <p className="text-xs text-destructive mt-1">
                          {hasError}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onBack}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Volver
                        </Button>
                        <Button variant="outline" onClick={() => setPreviewOpen(true)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Vista Previa CSV
                        </Button>
                    </div>
                    <Button 
                        onClick={onGenerateSQL} 
                        disabled={!allTasksValid || isLoading}
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                                Generando...
                            </>
                        ) : (
                            <>
                                Generar SQL
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>

            <CSVPreviewModal
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                csvData={csvData}
                selectedProcessIds={selectedRows}
                onSelectionChange={setSelectedRows}
            />

            <SQLPreviewModal
                open={sqlPreviewOpen}
                onOpenChange={setSqlPreviewOpen}
                taskData={selectedTaskData}
                config={config}
                title={`SQL: ${selectedTaskName}`}
                onExecute={handleExecuteSQL}
                isExecuting={isExecuting}
                executeResult={executeResult}
            />
        </div>
    );
}
