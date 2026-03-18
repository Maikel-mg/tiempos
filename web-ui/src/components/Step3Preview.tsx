import { useState, useMemo, useEffect, useCallback } from 'react';
import { ArrowLeft, Copy, Download, Check, FileCode, AlertCircle, RefreshCcw, Play, Loader2, Search, X, CheckSquare, Square, MinusSquare, ChevronDown, ChevronUp, Filter, Eye, EyeOff } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { downloadSQL, formatSQLForHighlight, generateSQL } from '@/lib/sql-generator';
import type { ParsedData, CSVIndices } from '@/lib/csv-parser';
import type { SQLResult } from '@/hooks/wizard/ports';

export interface Step3PreviewProps {
    sqlResult: SQLResult | null;
    onBack: () => void;
    onReset: () => void;
    fileName: string | undefined;
    dbConfig: any;
    csvData: ParsedData | null;
    selectedRows: number[];
    setSelectedRows: (rows: number[]) => void;
    config: {
        usuario: string;
        fase: string;
        tipoHora: string;
    };
    taskMapping: Record<string, string>;
    columnIndices: CSVIndices | null;
}

export function Step3Preview({ 
    sqlResult, 
    onBack, 
    onReset, 
    fileName,
    dbConfig,
    csvData,
    selectedRows,
    setSelectedRows,
    config,
    taskMapping,
    columnIndices
}: Step3PreviewProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const [localSelectedRows, setLocalSelectedRows] = useState<Set<number>>(new Set());
    const [copied, setCopied] = useState(false);
    const [showRaw, setShowRaw] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [executeResult, setExecuteResult] = useState<any>(null);
    const [dynamicSqlResult, setDynamicSqlResult] = useState<SQLResult | null>(null);
    const [sqlPreviewOpen, setSqlPreviewOpen] = useState(false);
    const [columnsPopoverOpen, setColumnsPopoverOpen] = useState(false);

    const pageSize = 50;
    const [isInitialized, setIsInitialized] = useState(false);
    const [columnsLoaded, setColumnsLoaded] = useState(false);

    const STORAGE_KEY = 'csv-import-hidden-columns';
    const DEFAULT_HIDDEN_COLUMNS = ['Usuario', 'Grupo', 'Correo Electronico', 'Etiquetas', 'Facturable'];
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set(DEFAULT_HIDDEN_COLUMNS));
    
    const allHeaders = csvData?.headers || [];
    const visibleHeaders = allHeaders.filter(h => !hiddenColumns.has(h));

    const toggleColumn = (header: string) => {
        setHiddenColumns(prev => {
            const next = new Set(prev);
            if (next.has(header)) {
                next.delete(header);
            } else {
                next.add(header);
            }
            return next;
        });
    };

    const showAllColumns = () => setHiddenColumns(new Set());
    const hideAllColumns = () => setHiddenColumns(new Set(allHeaders));

    const loadHiddenColumnsFromStorage = useCallback((headers: string[]) => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return new Set(DEFAULT_HIDDEN_COLUMNS);
            
            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed)) return new Set(DEFAULT_HIDDEN_COLUMNS);
            
            const headersLower = headers.map(h => h.toLowerCase());
            const validColumns = parsed.filter(col => {
                const idx = headersLower.indexOf(col.toLowerCase());
                return idx !== -1;
            }).map(col => {
                const idx = headersLower.indexOf(col.toLowerCase());
                return headers[idx];
            });
            
            return new Set(validColumns.length > 0 ? validColumns : DEFAULT_HIDDEN_COLUMNS);
        } catch {
            return new Set(DEFAULT_HIDDEN_COLUMNS);
        }
    }, []);

    const saveHiddenColumnsToStorage = useCallback((columns: Set<string>) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(columns)));
        } catch {
            // Silently fail if localStorage is not available
        }
    }, []);

    useEffect(() => {
        if (allHeaders.length > 0) {
            const loaded = loadHiddenColumnsFromStorage(allHeaders);
            setHiddenColumns(loaded);
            setColumnsLoaded(true);
        }
    }, [allHeaders, loadHiddenColumnsFromStorage]);

    useEffect(() => {
        if (csvData && allHeaders.length > 0 && columnsLoaded) {
            saveHiddenColumnsToStorage(hiddenColumns);
        }
    }, [hiddenColumns, csvData, allHeaders, columnsLoaded, saveHiddenColumnsToStorage]);

    useEffect(() => {
        if (!csvData || isInitialized) return;

        const initialSelected = selectedRows.length > 0
            ? new Set<number>(selectedRows)
            : new Set<number>(csvData.rows.map((_, i: number) => i));
        setLocalSelectedRows(initialSelected);
        setIsInitialized(true);
    }, [csvData, selectedRows, isInitialized]);

    const rawRows = csvData?.rows || [];

    const rows = useMemo(() => {
        return rawRows.map((row: string[], idx: number) => {
            const obj: Record<string, any> = { __index: idx };
            if (csvData) {
                visibleHeaders.forEach((header: string) => {
                    const originalIndex = csvData.headers.findIndex(h => h.toLowerCase() === header.toLowerCase());
                    if (originalIndex !== -1) {
                        obj[header] = row[originalIndex];
                    }
                });
            }
            return obj;
        });
    }, [rawRows, visibleHeaders, csvData]);

    const getRowKey = (row: any) => row.__index;

    const filteredRows = useMemo(() => {
        if (!searchTerm) return rows;
        const lowerSearch = searchTerm.toLowerCase();
        return rows.filter((row: any) => 
            Object.values(row).some(val => 
                String(val).toLowerCase().includes(lowerSearch)
            )
        );
    }, [rows, searchTerm]);

    const sortedRows = useMemo(() => {
        if (!sortColumn) return filteredRows;
        return [...filteredRows].sort((a: any, b: any) => {
            const aVal = a[sortColumn];
            const bVal = b[sortColumn];
            if (aVal === bVal) return 0;
            if (aVal === undefined || aVal === null) return 1;
            if (bVal === undefined || bVal === null) return -1;
            
            const comparison = aVal < bVal ? -1 : 1;
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [filteredRows, sortColumn, sortDirection]);

    const paginatedRows = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sortedRows.slice(start, start + pageSize);
    }, [sortedRows, currentPage]);

    const totalPages = Math.ceil(sortedRows.length / pageSize);

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            if (sortDirection === 'asc') {
                setSortDirection('desc');
            } else if (sortDirection === 'desc') {
                setSortColumn(null);
                setSortDirection('asc');
            }
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (column: string) => {
        if (sortColumn !== column) return null;
        return sortDirection === 'asc' ? ' ↑' : ' ↓';
    };

    const handleRowSelect = (row: any, isChecked: boolean) => {
        const rowKey = getRowKey(row);
        const newSelected = new Set(localSelectedRows);
        if (isChecked) {
            newSelected.add(rowKey);
        } else {
            newSelected.delete(rowKey);
        }
        setLocalSelectedRows(newSelected);
        setSelectedRows(Array.from(newSelected));
    };

    const handleSelectAll = () => {
        const allInPage = paginatedRows.map(getRowKey);
        const newSelected = new Set([...localSelectedRows, ...allInPage]);
        setLocalSelectedRows(newSelected);
        setSelectedRows(Array.from(newSelected));
    };

    const handleDeselectAll = () => {
        const allInPage = paginatedRows.map(getRowKey);
        const newSelected = new Set(localSelectedRows);
        allInPage.forEach((r: number) => newSelected.delete(r));
        setLocalSelectedRows(newSelected);
        setSelectedRows(Array.from(newSelected));
    };

    const isRowSelected = (row: any) => localSelectedRows.has(getRowKey(row));

    const isAllInPageSelected = paginatedRows.length > 0 && paginatedRows.every(row => localSelectedRows.has(getRowKey(row)));
    const isSomeInPageSelected = paginatedRows.some(row => localSelectedRows.has(getRowKey(row))) && !isAllInPageSelected;

    const generateDynamicSQL = useCallback(() => {
        if (!csvData || localSelectedRows.size === 0 || !columnIndices) {
            setDynamicSqlResult(null);
            return;
        }

        const selectedArray = Array.from(localSelectedRows);
        const rowsToProcess = csvData.rows.filter((_, index: number) => selectedArray.includes(index));
        
        const numericMapping: Record<string, string> = {};
        Object.entries(taskMapping).forEach(([task, id]) => {
            numericMapping[task] = id;
        });

        try {
            const result = generateSQL({
                rows: rowsToProcess,
                taskMapping: numericMapping,
                config,
                indices: columnIndices
            });
            setDynamicSqlResult(result as SQLResult);
        } catch (err) {
            console.error('Error generating SQL:', err);
        }
    }, [csvData, localSelectedRows, config, taskMapping, columnIndices]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            generateDynamicSQL();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [generateDynamicSQL]);

    const activeSqlResult = dynamicSqlResult || sqlResult;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(activeSqlResult?.sql || '');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Error al copiar:', err);
        }
    };

    const handleDownload = () => {
        const outputName = fileName?.replace('.csv', '.sql').replace('.txt', '.sql') || 'tiempos.sql';
        downloadSQL(activeSqlResult?.sql || '', outputName);
    };

    const handleExecuteBatchSQL = async () => {
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
                    sqlStatements: activeSqlResult?.statements || []
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

    const hasErrors = activeSqlResult?.errors && activeSqlResult.errors.length > 0;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <FileCode className="w-5 h-5" />
                                Seleccionar Filas para Importar
                            </CardTitle>
                            <CardDescription>
                                Selecciona las filas del CSV que deseas importar
                            </CardDescription>
                        </div>
                        <Badge variant="secondary">
                            {localSelectedRows.size} de {rows.length} filas seleccionadas
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <p className="text-2xl font-bold text-green-600">
                                {activeSqlResult?.processed || 0}
                            </p>
                            <p className="text-xs text-muted-foreground">Procesados</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <p className={`text-2xl font-bold ${hasErrors ? 'text-destructive' : 'text-green-600'}`}>
                                {activeSqlResult?.errors?.length || 0}
                            </p>
                            <p className="text-xs text-muted-foreground">Errores</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <p className="text-2xl font-bold">{localSelectedRows.size || 0}</p>
                            <p className="text-xs text-muted-foreground">Seleccionadas</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <p className="text-2xl font-bold">{rows.length}</p>
                            <p className="text-xs text-muted-foreground">Total filas</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar en cualquier columna..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="pl-10"
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
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleSelectAll}
                                disabled={paginatedRows.length === 0}
                            >
                                <CheckSquare className="w-4 h-4 mr-2" />
                                Seleccionar página
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleDeselectAll}
                                disabled={localSelectedRows.size === 0}
                            >
                                <Square className="w-4 h-4 mr-2" />
                                Deseleccionar
                            </Button>
                            <Popover open={columnsPopoverOpen} onOpenChange={setColumnsPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Filter className="w-4 h-4 mr-2" />
                                        Columnas
                                        <Badge variant="secondary" className="ml-2">
                                            {visibleHeaders.length}/{allHeaders.length}
                                        </Badge>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56" align="end">
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={showAllColumns} className="flex-1">
                                                <Eye className="w-4 h-4 mr-1" />
                                                Mostrar todas
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={hideAllColumns} className="flex-1">
                                                <EyeOff className="w-4 h-4 mr-1" />
                                                Ocultar todas
                                            </Button>
                                        </div>
                                        <Separator />
                                        <div className="max-h-[200px] overflow-y-auto space-y-1">
                                            {allHeaders.map((header) => {
                                                const isVisible = !hiddenColumns.has(header);
                                                return (
                                                    <button
                                                        key={header}
                                                        className="w-full flex items-center gap-2 p-1 hover:bg-muted rounded text-left transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleColumn(header);
                                                        }}
                                                    >
                                                        {isVisible ? (
                                                            <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                                                        ) : (
                                                            <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                                                        )}
                                                        <span className="text-sm truncate">
                                                            {header}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <div className="border rounded-lg overflow-x-auto">
                        <div className="min-w-[800px]">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10">
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
                                    {visibleHeaders.map((header) => (
                                        <TableHead 
                                            key={header} 
                                            className="cursor-pointer hover:bg-muted/50 whitespace-nowrap min-w-[100px]"
                                            onClick={() => handleSort(header)}
                                        >
                                            <div className="flex items-center gap-1">
                                                {header}
                                                {getSortIcon(header)}
                                            </div>
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedRows.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={visibleHeaders.length + 1} className="text-center py-8 text-muted-foreground">
                                            No hay datos para mostrar
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedRows.map((row) => (
                                        <TableRow key={row.__index} className={isRowSelected(row) ? 'bg-green-50' : ''}>
                                            <TableCell className="w-12">
                                                {isRowSelected(row) ? (
                                                    <CheckSquare 
                                                        className="w-4 h-4 cursor-pointer text-green-600" 
                                                        onClick={() => handleRowSelect(row, false)} 
                                                    />
                                                ) : (
                                                    <Square 
                                                        className="w-4 h-4 cursor-pointer" 
                                                        onClick={() => handleRowSelect(row, true)} 
                                                    />
                                                )}
                                            </TableCell>
                                            {visibleHeaders.map((header) => (
                                                <TableCell key={header} className="whitespace-nowrap min-w-[100px] max-w-[200px] overflow-hidden text-ellipsis">
                                                    {row[header] || '-'}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                            </Table>
                        </div>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between">
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

                    <Separator />

                    <div className="border rounded-lg overflow-hidden">
                        <button
                            onClick={() => setSqlPreviewOpen(!sqlPreviewOpen)}
                            disabled={localSelectedRows.size === 0}
                            className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div>
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <FileCode className="w-5 h-5" />
                                    SQL Preview
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {localSelectedRows.size > 0 
                                        ? `${localSelectedRows.size} filas seleccionadas`
                                        : 'Selecciona filas para ver el SQL'}
                                </p>
                            </div>
                            {localSelectedRows.size > 0 && (
                                sqlPreviewOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />
                            )}
                        </button>
                        
                        {sqlPreviewOpen && localSelectedRows.size > 0 && (
                            <div className="p-4 space-y-4">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowRaw(!showRaw)}
                                    >
                                        {showRaw ? 'Formato' : 'Sin formato'}
                                    </Button>
                                </div>

                                <ScrollArea className="h-[300px] border rounded-lg">
                                    {showRaw ? (
                                        <Textarea
                                            value={activeSqlResult?.sql || ''}
                                            readOnly
                                            className="h-full min-h-[300px] font-mono text-sm resize-none border-0 focus-visible:ring-0"
                                        />
                                    ) : (
                                        <div 
                                            className="p-4 font-mono text-sm whitespace-pre-wrap"
                                            dangerouslySetInnerHTML={{ 
                                                __html: formatSQLForHighlight(activeSqlResult?.sql || '') 
                                            }}
                                        />
                                    )}
                                </ScrollArea>
                            </div>
                        )}
                    </div>

                    {localSelectedRows.size > 0 && activeSqlResult && hasErrors && (
                        <Alert variant="warning">
                            <AlertCircle className="w-4 h-4" />
                            <AlertTitle>Algunos registros no se pudieron procesar</AlertTitle>
                            <AlertDescription>
                                <p className="mt-1">
                                    Se generaron {activeSqlResult.processed} sentencias SQL correctamente, pero {activeSqlResult.errors.length} registros tuvieron errores.
                                </p>
                            </AlertDescription>
                        </Alert>
                    )}

                    {executeResult && (
                        <Alert variant={executeResult.success ? "success" : "destructive"}>
                            <AlertCircle className="w-4 h-4" />
                            <AlertTitle>{executeResult.success ? "Ejecución exitosa" : "Error en ejecución"}</AlertTitle>
                            <AlertDescription>
                                {executeResult.message}
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
                <CardFooter className="flex justify-between">
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onBack}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Volver
                        </Button>
                        <Button variant="outline" onClick={onReset}>
                            <RefreshCcw className="w-4 h-4 mr-2" />
                            Nuevo archivo
                        </Button>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={handleCopy}
                            disabled={copied || localSelectedRows.size === 0}
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
                            onClick={handleExecuteBatchSQL}
                            disabled={isExecuting || localSelectedRows.size === 0}
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
                            disabled={localSelectedRows.size === 0}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Descargar .sql
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
