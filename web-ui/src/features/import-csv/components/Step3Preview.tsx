import { useState, useMemo, useEffect, useCallback } from 'react';
import { ArrowLeft, Copy, Download, Check, FileCode, AlertCircle, RefreshCcw, Play, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DataTable, createSelectColumn, ColumnDef } from '@/components/ui/data-table';
import { downloadSQL, formatSQLForHighlight } from '@/lib/sql-utils';
import { convertCsvToTimeEntries } from '../services/entry-converter';
import { usePreviewSql } from '../queries/preview-sql-query';
import type { ParsedData, CSVIndices } from '../services/csv-parser';
import type { SQLResult } from '../ports';

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

interface TableRow {
  __index: number;
  [key: string]: string | number;
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
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executeResult, setExecuteResult] = useState<any>(null);
  const [sqlPreviewOpen, setSqlPreviewOpen] = useState(false);
  const [selectedDataRows, setSelectedDataRows] = useState<TableRow[]>([]);

  const allHeaders = csvData?.headers || [];

  const tableData = useMemo(() => {
    if (!csvData) return [];
    return csvData.rows.map((row: string[], idx: number) => {
      const obj: TableRow = { __index: idx };
      allHeaders.forEach((header: string) => {
        const originalIndex = csvData.headers.findIndex(h => h.toLowerCase() === header.toLowerCase());
        if (originalIndex !== -1) {
          obj[header] = row[originalIndex] || '';
        }
      });
      return obj;
    });
  }, [csvData, allHeaders]);

  const columns = useMemo(() => {
    const cols: ColumnDef<TableRow>[] = [createSelectColumn()];

    allHeaders.forEach((header: string) => {
      cols.push({
        accessorKey: header,
        header: header,
        cell: ({ row }) => {
          const value = row.getValue(header);
          return (
            <span className="whitespace-nowrap min-w-[100px] max-w-[200px] overflow-hidden text-ellipsis block">
              {value as string || '-'}
            </span>
          );
        },
      });
    });

    return cols;
  }, [allHeaders]);

  const handleRowSelectionChange = useCallback((selectedRows: TableRow[]) => {
    setSelectedDataRows(selectedRows);
    const indices = selectedRows.map(row => row.__index);
    setSelectedRows(indices);
  }, [setSelectedRows]);

  useEffect(() => {
    if (csvData && selectedRows.length === 0) {
      const allRows = tableData;
      setSelectedDataRows(allRows);
      setSelectedRows(allRows.map(r => r.__index));
    }
  }, [csvData, selectedRows, tableData, setSelectedRows]);

  const previewPayload = useMemo(() => {
    if (!csvData || selectedDataRows.length === 0 || !columnIndices) {
      return null;
    }

    const rowsToProcess = csvData.rows.filter((_, index: number) =>
      selectedDataRows.some(row => row.__index === index)
    );

    const entries = convertCsvToTimeEntries({
      rows: rowsToProcess,
      taskMapping,
      config,
      indices: columnIndices,
    });

    if (entries.length === 0) return null;
    return { entries };
  }, [csvData, selectedDataRows, config, taskMapping, columnIndices]);

  const { data: previewData, isLoading: previewLoading, isError: previewError, error: previewErrorMsg } = usePreviewSql(
    previewPayload || { entries: [] },
    !!previewPayload && sqlPreviewOpen
  );

  const previewSql = previewData?.sql || '';
  const activeSqlResult: SQLResult | null = useMemo(() => {
    if (previewSql) {
      return {
        sql: previewSql,
        statements: previewSql.split(/\nGO\n/).filter(Boolean),
        processed: selectedDataRows.length,
        errors: [],
        total: selectedDataRows.length,
      };
    }
    return sqlResult;
  }, [previewSql, sqlResult, selectedDataRows.length]);

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
        message: 'Configura la conexion a la base de datos primero'
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
              {selectedDataRows.length} de {tableData.length} filas seleccionadas
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
              <p className="text-2xl font-bold">{selectedDataRows.length || 0}</p>
              <p className="text-xs text-muted-foreground">Seleccionadas</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <p className="text-2xl font-bold">{tableData.length}</p>
              <p className="text-xs text-muted-foreground">Total filas</p>
            </div>
          </div>

          {csvData && (
            <DataTable
              columns={columns}
              data={tableData}
              onRowSelectionChange={handleRowSelectionChange}
              selectedRows={selectedRows.length > 0 ? tableData.filter((_, i) => selectedRows.includes(i)) : undefined}
            />
          )}

          <Separator />

          <div className="border rounded-lg overflow-hidden">
            <button
              onClick={() => setSqlPreviewOpen(!sqlPreviewOpen)}
              disabled={selectedDataRows.length === 0}
              className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileCode className="w-5 h-5" />
                  SQL Preview
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedDataRows.length > 0
                    ? `${selectedDataRows.length} filas seleccionadas`
                    : 'Selecciona filas para ver el SQL'}
                </p>
              </div>
              {selectedDataRows.length > 0 && (
                sqlPreviewOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />
              )}
            </button>

            {sqlPreviewOpen && selectedDataRows.length > 0 && (
              <div className="p-4 space-y-4">
                {previewLoading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2 text-muted-foreground">Generando SQL...</span>
                  </div>
                )}

                {previewError && (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <AlertTitle>Error al generar SQL</AlertTitle>
                    <AlertDescription>{previewErrorMsg?.message || 'Error desconocido'}</AlertDescription>
                  </Alert>
                )}

                {!previewLoading && !previewError && (
                  <>
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
                  </>
                )}
              </div>
            )}
          </div>

          {selectedDataRows.length > 0 && activeSqlResult && hasErrors && (
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
              <AlertTitle>{executeResult.success ? "Ejecucion exitosa" : "Error en ejecucion"}</AlertTitle>
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
              disabled={copied || selectedDataRows.length === 0}
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
              disabled={isExecuting || selectedDataRows.length === 0}
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
              disabled={selectedDataRows.length === 0}
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
