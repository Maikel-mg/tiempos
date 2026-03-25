import { useState, useMemo, useEffect } from 'react';
import { Search, X, ChevronUp, ChevronDown, ChevronsUpDown, CheckSquare, Square, MinusSquare, Maximize2, Minimize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ParsedData } from '../services/csv-parser';

export interface CSVPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  csvData: ParsedData | null;
  selectedProcessIds: number[];
  onSelectionChange?: (rows: number[]) => void;
}

export function CSVPreviewModal({ 
  open, 
  onOpenChange, 
  csvData, 
  selectedProcessIds, 
  onSelectionChange 
}: CSVPreviewModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set(selectedProcessIds));
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  useEffect(() => {
    setSelectedRows(new Set(selectedProcessIds));
  }, [selectedProcessIds]);

  useEffect(() => {
    if (open) {
      setSearchTerm('');
      setSortColumn(null);
      setSortDirection('asc');
      setCurrentPage(1);
    }
  }, [open]);
  
  const pageSize = 100;

  const headers = csvData?.headers || [];
  const rawRows = csvData?.rows || [];
  
  const rows = useMemo(() => {
    return rawRows.map((row, idx) => {
      if (Array.isArray(row)) {
        const obj: Record<string, any> = { __index: idx };
        headers.forEach((header, index) => {
          obj[header] = row[index];
        });
        return obj;
      }
      return { ...(row as Record<string, unknown>), __index: idx };
    });
  }, [rawRows, headers]);

  const getRowKey = (row: any) => row.__index;

  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows;
    const lowerSearch = searchTerm.toLowerCase();
    return rows.filter(row => 
      Object.values(row).some(val => 
        String(val).toLowerCase().includes(lowerSearch)
      )
    );
  }, [rows, searchTerm]);

  const sortedRows = useMemo(() => {
    if (!sortColumn) return filteredRows;
    return [...filteredRows].sort((a, b) => {
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
    if (sortColumn !== column) return <ChevronsUpDown className="w-4 h-4 opacity-50" />;
    if (sortDirection === 'asc') return <ChevronUp className="w-4 h-4" />;
    return <ChevronDown className="w-4 h-4" />;
  };

  const handleRowSelect = (row: any, isChecked: boolean) => {
    const rowKey = getRowKey(row);
    const newSelected = new Set(selectedRows);
    if (isChecked) {
      newSelected.add(rowKey);
    } else {
      newSelected.delete(rowKey);
    }
    setSelectedRows(newSelected);
    onSelectionChange?.(Array.from(newSelected));
  };

  const handleSelectAll = () => {
    const allInPage = paginatedRows.map(getRowKey);
    const newSelected = new Set([...selectedRows, ...allInPage]);
    setSelectedRows(newSelected);
    onSelectionChange?.(Array.from(newSelected));
  };

  const handleDeselectAll = () => {
    const allInPage = paginatedRows.map(getRowKey);
    const newSelected = new Set(selectedRows);
    allInPage.forEach(r => newSelected.delete(r));
    setSelectedRows(newSelected);
    onSelectionChange?.(Array.from(newSelected));
  };

  const isRowSelected = (row: any) => {
    return selectedRows.has(getRowKey(row));
  };

  const isAllInPageSelected = paginatedRows.length > 0 && paginatedRows.every(row => selectedRows.has(getRowKey(row)));
  const isSomeInPageSelected = paginatedRows.some(row => selectedRows.has(getRowKey(row))) && !isAllInPageSelected;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`${isFullscreen ? 'max-w-[100vw] w-[100vw] h-[100vh] h-screen max-h-[100vh] rounded-none' : 'max-w-6xl w-[95vw]'}`.trim()} 
        onClose={() => onOpenChange(false)}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Vista Previa de CSV
            <Badge variant="secondary">
              {sortedRows.length} de {rows.length} filas
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="ml-2"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
          </DialogTitle>
          <DialogDescription>
            Visualiza los datos del CSV antes de generar el SQL. 
            Usa los filtros para buscar y selecciona las filas que deseas incluir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
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
                disabled={selectedRows.size === 0}
              >
                <Square className="w-4 h-4 mr-2" />
                Deseleccionar
              </Button>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {selectedRows.size} fila(s) seleccionada(s) para importar
          </div>

          <ScrollArea className={`border rounded-lg ${isFullscreen ? 'h-[calc(100vh-280px)]' : 'h-[500px]'}`}>
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
                  {headers.map((header) => (
                    <TableHead 
                      key={header} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort(header)}
                    >
                      <div className="flex items-center gap-2">
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
                    <TableCell colSpan={headers.length + 1} className="text-center py-8 text-muted-foreground">
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
                      {headers.map((header) => (
                        <TableCell key={header}>
                          {row[header] || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>

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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
