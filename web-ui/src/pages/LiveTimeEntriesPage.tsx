import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ArrowLeft, RefreshCw, AlertCircle, Loader2, Search, X, CheckSquare, Square, MinusSquare, FileCode, Copy, Download, Play, ChevronDown, ChevronUp, Check, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { generateSQLFromObjects, formatSQLForHighlight, downloadSQL, copyToClipboard, type SQLGenerationResult } from '@/lib/sql-generator';
import { loadMappings, type TaskMappings } from '@/lib/task-mapping-storage';
import { ImportConfigPanel, type ImportConfig } from '@/components/ImportConfigPanel';
import { TaskMappingTable } from '@/components/TaskMappingTable';
import type { DbConfig } from '@/components/DBConnection';

interface TimeEntry {
    id?: string;
    description: string;
    taskName?: string;
    task?: { name: string };
    project?: { name: string };
    projectId?: string;
    timeInterval: {
        start: string;
        end: string;
        duration: number | string;
    };
}

function formatDuration(seconds: number) {
    if (!seconds && seconds !== 0) return '00:00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatDurationDecimal(seconds: number) {
    if (!seconds && seconds !== 0) return '0.00';
    return (seconds / 3600).toFixed(2);
}

function parseISO8601Duration(durationString: string | undefined | null): number {
    if (!durationString) return 0;
    const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
    const match = durationString.match(regex);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    
    return hours * 3600 + minutes * 60 + seconds;
}

function formatDateDDMMYYYY(dateString: string | undefined | null) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function formatTimeHHMMSS(dateString: string | undefined | null) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

const DEFAULT_CONFIG: ImportConfig = {
    usuario: '',
    fase: '',
    tipoHora: '11'
};

const DB_CONFIG_KEY = 'db_connection_config';

function decryptPassword(encoded: string): string {
    try {
        return atob(encoded);
    } catch {
        return '';
    }
}

export function LiveTimeEntriesPage() {
    const navigate = useNavigate();
    const [entries, setEntries] = useState<TimeEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortColumn, setSortColumn] = useState<string>('start');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;
    
    // Selection state
    const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
    const [sqlPreviewOpen, setSqlPreviewOpen] = useState(false);
    const [sqlResult, setSqlResult] = useState<SQLGenerationResult | null>(null);
    const [showRawSql, setShowRawSql] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [executeResult, setExecuteResult] = useState<any>(null);
    
    // Validation state
    const [isValidating, setIsValidating] = useState(false);
    const [validatedEntries, setValidatedEntries] = useState<any[]>([]);
    const [hideAlreadyCreated, setHideAlreadyCreated] = useState(false);
    
    // Config from localStorage
    const [config, setConfig] = useState<ImportConfig>(DEFAULT_CONFIG);
    const [taskMapping, setTaskMapping] = useState<TaskMappings>({});
    const [dbConfig, setDbConfig] = useState<DbConfig | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(() => new Date());

    // Load config and mappings on mount
    useEffect(() => {
        try {
            const storedMappings = loadMappings();
            setTaskMapping(storedMappings);
            
            const storedConfig = localStorage.getItem('wizard_config');
            if (storedConfig) {
                setConfig(JSON.parse(storedConfig));
            }
            
            const storedDbConfig = localStorage.getItem(DB_CONFIG_KEY);
            if (storedDbConfig) {
                const parsed = JSON.parse(storedDbConfig);
                setDbConfig({
                    ...parsed,
                    password: parsed.password ? decryptPassword(parsed.password) : ''
                });
            }
        } catch (e) {
            console.error('Error loading config:', e);
        }
    }, []);
    
    // Inicializar con primer y último día del mes actual
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const [startDate, setStartDate] = useState(firstDayOfMonth.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(lastDayOfMonth.toISOString().split('T')[0]);

    // Update selectedMonth when startDate changes
    useEffect(() => {
        if (startDate) {
            setSelectedMonth(new Date(startDate));
        }
    }, [startDate]);

    const fetchValidation = async (sDate: string, eDate: string) => {
        console.log(`TCL ~ fetchValidation ~ sDate:`, sDate)
        if (!dbConfig?.server || !dbConfig?.database || !dbConfig?.username) return;

        setIsValidating(true);
        try {
            const response = await fetch('http://localhost:3001/api/validate-entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    server: dbConfig.server,
                    database: dbConfig.database,
                    username: dbConfig.username,
                    password: dbConfig.password,
                    startDate: sDate,
                    endDate: eDate
                })
            });
            console.log(`TCL ~ fetchValidation ~ response:`, response)

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    // Flatten data from all months
                    const allData = data.results.flatMap((r: any) => r.data);
                    setValidatedEntries(allData);
                }
            }
        } catch (err) {
            console.error('Error validating entries:', err);
        } finally {
            setIsValidating(false);
        }
    };

    const fetchReport = async () => {
        setLoading(true);
        setError(null);
        try {
            const startIso = `${startDate}T00:00:00Z`;
            const endIso = `${endDate}T23:59:59Z`;
            
            const response = await fetch(`http://localhost:3001/api/clockify/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startDate: startIso,
                    endDate: endIso
                })
            });
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            const sortedEntries = (data.data as TimeEntry[]).sort((a, b) => new Date(b.timeInterval.start).getTime() - new Date(a.timeInterval.start).getTime());
            setEntries(sortedEntries);
            setSelectedEntries(new Set());
            setSqlResult(null);

            // Fetch validation
            fetchValidation(startDate, endDate);
        } catch (err: any) {
            setError(err.message || 'Error al cargar los datos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []);

    const isAlreadyCreated = (entry: TimeEntry) => {
        if (!validatedEntries.length) return false;
        
        const entryDate = new Date(entry.timeInterval.start);
        const entryDay = entryDate.getDate();
        const entryMonth = entryDate.getMonth() + 1;
        const entryYear = entryDate.getFullYear();
        const entryStart = formatTimeHHMMSS(entry.timeInterval.start).slice(0, 5);
        const entryEnd = formatTimeHHMMSS(entry.timeInterval.end).slice(0, 5);

        return validatedEntries.some(v => {
            const vDate = new Date(v.Fecha);
            const vStart = v.Desde; // SP format is 'HH:MM'
            const vEnd = v.Hasta;   // SP format is 'HH:MM'
            
            return vDate.getDate() === entryDay && 
                   (vDate.getMonth() + 1) === entryMonth && 
                   vDate.getFullYear() === entryYear &&
                   vStart === entryStart &&
                   vEnd === entryEnd;
        });
    };

    const filteredEntries = useMemo(() => {
        let result = entries;

        if (hideAlreadyCreated) {
            result = result.filter(entry => !isAlreadyCreated(entry));
        }

        if (!searchTerm) return result;
        const lowerSearch = searchTerm.toLowerCase();
        return result.filter(entry => 
            (entry.description || '').toLowerCase().includes(lowerSearch) ||
            (entry.project?.name || '').toLowerCase().includes(lowerSearch) ||
            (entry.projectId || '').toLowerCase().includes(lowerSearch) ||
            (entry.task?.name || '').toLowerCase().includes(lowerSearch) ||
            (entry.taskName || '').toLowerCase().includes(lowerSearch)
        );
    }, [entries, searchTerm, hideAlreadyCreated, validatedEntries]);

    const sortedEntries = useMemo(() => {
        return [...filteredEntries].sort((a, b) => {
            let aVal: any, bVal: any;
            switch (sortColumn) {
                case 'start':
                    aVal = new Date(a.timeInterval?.start || 0).getTime();
                    bVal = new Date(b.timeInterval?.start || 0).getTime();
                    break;
                case 'end':
                    aVal = new Date(a.timeInterval?.end || 0).getTime();
                    bVal = new Date(b.timeInterval?.end || 0).getTime();
                    break;
                case 'project':
                    aVal = (a.project?.name || '').toLowerCase();
                    bVal = (b.project?.name || '').toLowerCase();
                    break;
                case 'description':
                    aVal = (a.description || '').toLowerCase();
                    bVal = (b.description || '').toLowerCase();
                    break;
                case 'duration':
                    aVal = typeof a.timeInterval?.duration === 'number' ? a.timeInterval.duration : parseISO8601Duration(a.timeInterval?.duration);
                    bVal = typeof b.timeInterval?.duration === 'number' ? b.timeInterval.duration : parseISO8601Duration(b.timeInterval?.duration);
                    break;
                case 'task':
                    aVal = (a.taskName || a.task?.name || '').toLowerCase();
                    bVal = (b.taskName || b.task?.name || '').toLowerCase();
                    break;
                default:
                    return 0;
            }
            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredEntries, sortColumn, sortDirection]);

    const paginatedEntries = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sortedEntries.slice(start, start + pageSize);
    }, [sortedEntries, currentPage]);

    const totalPages = Math.ceil(sortedEntries.length / pageSize);

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (column: string) => {
        if (sortColumn !== column) return null;
        return sortDirection === 'asc' ? ' ↑' : ' ↓';
    };

    // Selection handlers
    const getEntryUniqueId = (entry: TimeEntry) => {
        return entry.id || `${entry.timeInterval?.start}-${entry.timeInterval?.end}-${entry.project?.name || entry.projectId}-${entry.taskName || entry.task?.name || ''}`;
    };

    const handleRowSelect = (entryId: string, isChecked: boolean) => {
        const newSelected = new Set(selectedEntries);
        if (isChecked) {
            newSelected.add(entryId);
        } else {
            newSelected.delete(entryId);
        }
        setSelectedEntries(newSelected);
    };

    const handleSelectAll = () => {
        const allIds = paginatedEntries
            .filter(e => !isAlreadyCreated(e))
            .map(e => getEntryUniqueId(e));
        const newSelected = new Set([...selectedEntries, ...allIds]);
        setSelectedEntries(newSelected);
    };

    const handleDeselectAll = () => {
        const allIds = new Set(paginatedEntries.map(e => getEntryUniqueId(e)));
        const newSelected = new Set(selectedEntries);
        allIds.forEach(id => newSelected.delete(id));
        setSelectedEntries(newSelected);
    };

    const isRowSelected = (entryId: string) => selectedEntries.has(entryId);
    
    const selectableInPage = paginatedEntries.filter(e => !isAlreadyCreated(e));
    const isAllInPageSelected = selectableInPage.length > 0 && selectableInPage.every(e => selectedEntries.has(getEntryUniqueId(e)));
    const isSomeInPageSelected = selectableInPage.some(e => selectedEntries.has(getEntryUniqueId(e))) && !isAllInPageSelected;

    // Handle task ID update
    const handleUpdateTaskId = useCallback((taskName: string, taskId: string) => {
        setTaskMapping(prev => ({
            ...prev,
            [taskName]: taskId
        }));
    }, []);

    // Check if all selected entries have mapped tasks
    const hasUnmappedTasks = useMemo(() => {
        if (selectedEntries.size === 0) return false;
        
        const selectedData = entries.filter(e => selectedEntries.has(getEntryUniqueId(e)));
        const taskNames = new Set(selectedData.map(e => e.taskName || e.task?.name || ''));
        
        return Array.from(taskNames).some(taskName => {
            const id = taskMapping[taskName];
            return !id || !/^[1-9]\d*$/.test(id);
        });
    }, [entries, selectedEntries, taskMapping]);

    // Generate SQL for selected entries
    const generateSQL = useCallback(() => {
        if (selectedEntries.size === 0) {
            setSqlResult(null);
            return;
        }

        const selectedData = entries.filter(e => selectedEntries.has(getEntryUniqueId(e)));
        
        try {
            const result = generateSQLFromObjects({
                entries: selectedData,
                taskMapping,
                config
            });
            setSqlResult(result as SQLGenerationResult);
        } catch (err: any) {
            console.error('Error generating SQL:', err);
            setSqlResult({
                sql: '',
                statements: [],
                processed: 0,
                errors: [{ message: err.message }],
                total: selectedData.length
            });
        }
    }, [entries, selectedEntries, taskMapping, config]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            generateSQL();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [generateSQL]);

    const handleCopy = async () => {
        const success = await copyToClipboard(sqlResult?.sql || '');
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDownload = () => {
        const fileName = `tiempos-live-${startDate}-${endDate}.sql`;
        downloadSQL(sqlResult?.sql || '', fileName);
    };

    const handleExecuteSQL = async () => {
        if (!dbConfig?.server || !dbConfig?.database || !dbConfig?.username) {
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
                    sqlStatements: sqlResult?.statements || []
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

    const hasErrors = sqlResult?.errors && sqlResult.errors.length > 0;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="border-b bg-card">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => navigate('/')}
                            >
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                Volver
                            </Button>
                            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">Ver Tiempos en Vivo</h1>
                                <p className="text-sm text-muted-foreground">
                                    Visualización de Clockify
                                </p>
                            </div>
                        </div>
                             <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="mr-2">
                                    {selectedEntries.size} seleccionadas
                                </Badge>
                                {isValidating && (
                                    <Badge variant="outline" className="animate-pulse flex items-center gap-1 border-blue-200 text-blue-600">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Validando...
                                    </Badge>
                                )}
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={fetchReport}
                                    disabled={loading}
                                >
                                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                    Actualizar
                                </Button>
                            </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-4">
                <ImportConfigPanel 
                    config={config} 
                    onUpdateConfig={setConfig}
                    selectedMonth={selectedMonth}
                />
            </div>

            <main className="flex-1 container mx-auto px-4 py-8">
                {loading && !entries.length ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-3 text-muted-foreground">Cargando entradas de tiempo...</span>
                    </div>
                ) : error ? (
                    <Card className="max-w-2xl mx-auto">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3 text-destructive mb-4">
                                <AlertCircle className="h-5 w-5" />
                                <span className="font-medium">Error al cargar datos</span>
                            </div>
                            <p className="text-muted-foreground mb-4">{error}</p>
                            <Button onClick={fetchReport}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Reintentar
                            </Button>
                        </CardContent>
                    </Card>
                ) : entries.length === 0 ? (
                    <Card className="max-w-2xl mx-auto">
                        <CardContent className="pt-6 text-center py-12">
                            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No hay entradas de tiempo</h3>
                            <p className="text-muted-foreground">
                                No se encontraron registros en el rango de fechas actual.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-8">
                        {/* Task Mapping Section */}
                        <TaskMappingTable 
                            entries={entries}
                            taskMapping={taskMapping}
                            onUpdateTaskId={handleUpdateTaskId}
                            config={config}
                            dbConfig={dbConfig}
                        />

                        <Card>
                            <CardHeader>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">
                                        {entries.length === sortedEntries.length 
                                            ? `${entries.length} ${entries.length === 1 ? 'entrada' : 'entradas'}`
                                            : `${sortedEntries.length} de ${entries.length} entradas`
                                        }
                                    </CardTitle>
                                    <div className="relative w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar..."
                                            value={searchTerm}
                                            onChange={(e) => {
                                                setSearchTerm(e.target.value);
                                                setCurrentPage(1);
                                            }}
                                            className="pl-10 pr-10"
                                        />
                                        {searchTerm && (
                                            <button
                                                onClick={() => setSearchTerm('')}
                                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                            >
                                                <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="startDate" className="text-sm font-normal">Desde:</Label>
                                        <Input
                                            id="startDate"
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-48"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="endDate" className="text-sm font-normal">Hasta:</Label>
                                        <Input
                                            id="endDate"
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-48"
                                        />
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={fetchReport}
                                        disabled={loading}
                                    >
                                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                        Aplicar filtro
                                    </Button>
                                    <div className="flex items-center gap-2 ml-4">
                                        <Button
                                            variant={hideAlreadyCreated ? "secondary" : "outline"}
                                            size="sm"
                                            onClick={() => setHideAlreadyCreated(!hideAlreadyCreated)}
                                            className="flex items-center gap-2"
                                        >
                                            {hideAlreadyCreated ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            {hideAlreadyCreated ? "Mostrando pendientes" : "Ocultar ya creadas"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Selection controls */}
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={handleSelectAll}
                                    disabled={paginatedEntries.length === 0}
                                >
                                    <CheckSquare className="w-4 h-4 mr-1" />
                                    Seleccionar página
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={handleDeselectAll}
                                    disabled={selectedEntries.size === 0}
                                >
                                    <Square className="w-4 h-4 mr-1" />
                                    Deseleccionar
                                </Button>
                            </div>

                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">
                                                {isAllInPageSelected ? (
                                                    <CheckSquare className="w-4 h-4 cursor-pointer" onClick={handleDeselectAll} />
                                                ) : isSomeInPageSelected ? (
                                                    <MinusSquare className="w-4 h-4 cursor-pointer" onClick={handleSelectAll} />
                                                ) : (
                                                    <Square className="w-4 h-4 cursor-pointer" onClick={handleSelectAll} />
                                                )}
                                            </TableHead>
                                            <TableHead 
                                                className="whitespace-nowrap cursor-pointer hover:bg-muted/50"
                                                onClick={() => handleSort('start')}
                                            >
                                                Fecha {getSortIcon('start')}
                                            </TableHead>
                                            <TableHead 
                                                className="whitespace-nowrap cursor-pointer hover:bg-muted/50"
                                                onClick={() => handleSort('start')}
                                            >
                                                Inicio {getSortIcon('start')}
                                            </TableHead>
                                            <TableHead 
                                                className="whitespace-nowrap cursor-pointer hover:bg-muted/50"
                                                onClick={() => handleSort('end')}
                                            >
                                                Fin {getSortIcon('end')}
                                            </TableHead>
                                            <TableHead 
                                                className="whitespace-nowrap cursor-pointer hover:bg-muted/50"
                                                onClick={() => handleSort('task')}
                                            >
                                                Tarea {getSortIcon('task')}
                                            </TableHead>
                                            <TableHead 
                                                className="whitespace-nowrap cursor-pointer hover:bg-muted/50"
                                                onClick={() => handleSort('description')}
                                            >
                                                Descripción {getSortIcon('description')}
                                            </TableHead>
                                            <TableHead 
                                                className="whitespace-nowrap text-right cursor-pointer hover:bg-muted/50"
                                                onClick={() => handleSort('duration')}
                                            >
                                                Duración {getSortIcon('duration')}
                                            </TableHead>
                                            <TableHead 
                                                className="whitespace-nowrap text-right cursor-pointer hover:bg-muted/50"
                                                onClick={() => handleSort('duration')}
                                            >
                                                Duración (dec) {getSortIcon('duration')}
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedEntries.map((entry) => {
                                            const durationSeconds = typeof entry.timeInterval?.duration === 'number' ? entry.timeInterval.duration : parseISO8601Duration(entry.timeInterval?.duration);
                                            const isCreated = isAlreadyCreated(entry);
                                            return (
                                            <TableRow 
                                                key={getEntryUniqueId(entry)} 
                                                className={`
                                                    ${isRowSelected(getEntryUniqueId(entry)) ? 'bg-green-50' : ''}
                                                    ${isCreated ? 'opacity-60 bg-muted/20' : ''}
                                                `}
                                            >
                                                <TableCell className="w-12">
                                                    {isCreated ? (
                                                        <div className="flex items-center justify-center">
                                                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                        </div>
                                                    ) : isRowSelected(getEntryUniqueId(entry)) ? (
                                                        <CheckSquare 
                                                            className="w-4 h-4 cursor-pointer text-green-600" 
                                                            onClick={() => handleRowSelect(getEntryUniqueId(entry), false)} 
                                                        />
                                                    ) : (
                                                        <Square 
                                                            className="w-4 h-4 cursor-pointer" 
                                                            onClick={() => handleRowSelect(getEntryUniqueId(entry), true)} 
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        {formatDateDDMMYYYY(entry.timeInterval?.start)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap font-mono">
                                                    {formatTimeHHMMSS(entry.timeInterval?.start)}
                                                </TableCell>
                                                <TableCell className="whitespace-nowrap font-mono">
                                                    {formatTimeHHMMSS(entry.timeInterval?.end)}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {entry.taskName || entry.task?.name || '-'}
                                                </TableCell>
                                                <TableCell className="max-w-xs truncate">
                                                    {entry.description || '-'}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {formatDuration(durationSeconds)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {formatDurationDecimal(durationSeconds)}
                                                </TableCell>
                                            </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                            
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <div className="text-sm text-muted-foreground">
                                        Página {currentPage} de {totalPages}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            Anterior
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                        >
                                            Siguiente
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* SQL Preview Section */}
                            <Separator />

                            <div className="border rounded-lg overflow-hidden">
                                <button
                                    onClick={() => setSqlPreviewOpen(!sqlPreviewOpen)}
                                    disabled={selectedEntries.size === 0 || hasUnmappedTasks}
                                    className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div>
                                        <h3 className="text-lg font-semibold flex items-center gap-2">
                                            <FileCode className="w-5 h-5" />
                                            SQL Preview
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {hasUnmappedTasks 
                                                ? 'Hay tareas sin asignar ID'
                                                : selectedEntries.size > 0 
                                                    ? `${selectedEntries.size} filas seleccionadas`
                                                    : 'Selecciona filas para ver el SQL'}
                                        </p>
                                    </div>
                                    {selectedEntries.size > 0 && (
                                        sqlPreviewOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />
                                    )}
                                </button>
                                
                                {sqlPreviewOpen && selectedEntries.size > 0 && (
                                    <div className="p-4 space-y-4">
                                        {/* Stats */}
                                        <div className="grid grid-cols-4 gap-4">
                                            <div className="p-3 bg-muted/50 rounded-lg text-center">
                                                <p className="text-2xl font-bold text-green-600">
                                                    {sqlResult?.processed || 0}
                                                </p>
                                                <p className="text-xs text-muted-foreground">Procesados</p>
                                            </div>
                                            <div className="p-3 bg-muted/50 rounded-lg text-center">
                                                <p className={`text-2xl font-bold ${hasErrors ? 'text-destructive' : 'text-green-600'}`}>
                                                    {sqlResult?.errors?.length || 0}
                                                </p>
                                                <p className="text-xs text-muted-foreground">Errores</p>
                                            </div>
                                            <div className="p-3 bg-muted/50 rounded-lg text-center">
                                                <p className="text-2xl font-bold">{selectedEntries.size || 0}</p>
                                                <p className="text-xs text-muted-foreground">Seleccionadas</p>
                                            </div>
                                            <div className="p-3 bg-muted/50 rounded-lg text-center">
                                                <p className="text-2xl font-bold">{entries.length}</p>
                                                <p className="text-xs text-muted-foreground">Total filas</p>
                                            </div>
                                        </div>

                                        {hasErrors && (
                                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                <p className="text-sm text-yellow-800">
                                                    {sqlResult!.errors.length} registro(s) no se pudieron procesar. Verifica el mapeo de tareas.
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setShowRawSql(!showRawSql)}
                                            >
                                                {showRawSql ? 'Formato' : 'Sin formato'}
                                            </Button>
                                        </div>

                                        <ScrollArea className="h-[300px] border rounded-lg">
                                            {showRawSql ? (
                                                <Textarea
                                                    value={sqlResult?.sql || ''}
                                                    readOnly
                                                    className="h-full min-h-[300px] font-mono text-sm resize-none border-0 focus-visible:ring-0"
                                                />
                                            ) : (
                                                <div 
                                                    className="p-4 font-mono text-sm whitespace-pre-wrap"
                                                    dangerouslySetInnerHTML={{ 
                                                        __html: formatSQLForHighlight(sqlResult?.sql || '') 
                                                    }}
                                                />
                                            )}
                                        </ScrollArea>

                                        {/* Action Buttons */}
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={handleCopy}
                                                disabled={copied || !sqlResult?.sql}
                                            >
                                            {copied ? (
                                                <>
                                                    <Check className="w-4 h-4 mr-2" />
                                                    Copiado
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-4 h-4 mr-2" />
                                                    Copiar
                                                </>
                                            )}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={handleExecuteSQL}
                                                disabled={isExecuting || !sqlResult?.sql}
                                            >
                                                {isExecuting ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Ejecutando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Play className="w-4 h-4 mr-2" />
                                                        Ejecutar en BD
                                                    </>
                                                )}
                                            </Button>
                                            <Button 
                                                onClick={handleDownload}
                                                disabled={!sqlResult?.sql}
                                            >
                                                <Download className="w-4 h-4 mr-2" />
                                                Descargar .sql
                                            </Button>
                                        </div>

                                        {/* Execution Result */}
                                        {executeResult && (
                                            <div className={`p-4 rounded-lg ${executeResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                                <p className={`font-medium ${executeResult.success ? 'text-green-800' : 'text-red-800'}`}>
                                                    {executeResult.success ? 'Ejecución exitosa' : 'Error en ejecución'}
                                                </p>
                                                <p className="text-sm mt-1">{executeResult.message}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
                )}
            </main>
        </div>
    );
}
