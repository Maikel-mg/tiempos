/**
 * ProcessMappingTable - UI component for mapping processes to IDs
 * 
 * This component is a thin UI layer that delegates all business logic to:
 * - useProcessManagement hook (state management)
 * - processSQLService (SQL generation)
 * - processValidation (validation)
 * 
 * No business logic should be added directly to this component.
 */

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { calculateHours } from '@/lib/utils';
import { processValidation } from '../services';
import type { Process, ProcessFilterType, ProcessConfig } from '../types';
import { Edit2, Check, AlertCircle, Eye, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { ProcessSelector } from './ProcessSelector';
import { SQLPreviewModal } from '@/components/SQLPreviewModal';
import { useCreateProcess } from '@/features/process-management/mutations/useCreateProcess';
import { formatISOToSQLDate } from '@/lib/sql-utils';
import type { Project } from '@/features/projects/types';

export interface ProcessMappingTableProps {
  processes: Process[];
  taskMapping: Record<string, string>;
  localErrors: Record<string, string | null>;
  config: ProcessConfig;
  onUpdateProcessId: (processName: string, processId: string) => void;
}

export function ProcessMappingTable({
  processes,
  taskMapping,
  localErrors,
  config,
  onUpdateProcessId
}: ProcessMappingTableProps) {
    const [searchTerm, setSearchTerm] = useState('');
   const [filter, setFilter] = useState<ProcessFilterType>('all');
   const [isExpanded, setIsExpanded] = useState(true);

   // Selector state
   const [selectorOpen, setSelectorOpen] = useState(false);
   const [selectedProcessName, setSelectedProcessName] = useState<string | null>(null);

   // Preview modal state
   const [previewProcess, setPreviewProcess] = useState<Process | null>(null);

   // Create new process state
   const [isCreateNewOpen, setIsCreateNewOpen] = useState(false);
   const [createNewFases, setCreateNewFases] = useState<Array<{ id: string; label: string }>>([]);
   const [createNewProject, setCreateNewProject] = useState<Project | null>(null);

   // Create process mutation
   const createProcess = useCreateProcess();

  // Computed values
  const mappedProcessCount = useMemo(() => 
    processValidation.countAssigned(processes, taskMapping),
    [processes, taskMapping]
  );
  
  const unassignedCount = processes.length - mappedProcessCount;
  const allAssigned = unassignedCount === 0 && processes.length > 0;

  // Filter processes
  const filteredProcesses = useMemo(() => {
    let filtered = processes;

    if (filter === 'assigned') {
      filtered = filtered.filter(p => processValidation.isProcessAssigned(taskMapping, p.name));
    } else if (filter === 'unassigned') {
      filtered = filtered.filter(p => !processValidation.isProcessAssigned(taskMapping, p.name));
    }

    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [processes, taskMapping, filter, searchTerm]);

   const handleInputClick = (processName: string) => {
     setSelectedProcessName(processName);
     setSelectorOpen(true);
   };

  const handleProcessSelect = (_projectCode: string, processId: string) => {
    if (selectedProcessName) {
      onUpdateProcessId(selectedProcessName, processId);
      setSelectorOpen(false);
    }
  };

  const handleCreateNew = (data: { fases: Array<{ id: string; label: string }>; usuario: string; projectInfo?: Project }) => {
    setSelectorOpen(false);
    setCreateNewFases(data.fases);
    setCreateNewProject(data.projectInfo || null);
    setIsCreateNewOpen(true);
  };

  const FilterButton = ({ type, label, count }: { type: ProcessFilterType, label: string, count: number }) => (
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
    <>
      <Card>
        <button onClick={() => setIsExpanded(!isExpanded)} className="w-full">
          <CardHeader className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
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
                {mappedProcessCount}/{processes.length} tareas
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
                <FilterButton type="all" label="Todas" count={processes.length} />
                <FilterButton type="unassigned" label="Sin asignar" count={unassignedCount} />
                <FilterButton type="assigned" label="Asignadas" count={mappedProcessCount} />
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
                  {filteredProcesses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No hay tareas que mostrar con el filtro actual
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProcesses.map((process, index) => {
                      const id = taskMapping[process.name] || '';
                      const hasError = localErrors[process.name];
                      const isValid = processValidation.isProcessAssigned(taskMapping, process.name);
                      const fechaIni = formatISOToSQLDate(process.fechaInicio);
                      const fechaFin = formatISOToSQLDate(process.fechaFin);

                      return (
                        <TableRow key={index} className={!isValid ? 'bg-yellow-50/50' : ''}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2 min-w-0">
                              {isValid ? (
                                <Check className="w-4 h-4 text-green-500 shrink-0" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0" />
                              )}
                              <span className="truncate" title={process.name}>
                                {process.name}
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
                                  onChange={(e) => onUpdateProcessId(process.name, e.target.value)}
                                  onClick={() => handleInputClick(process.name)}
                                  placeholder="Seleccionar ID..."
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
                                  onClick={() => setPreviewProcess(process)}
                                  title="Previsualizar SQL de Creación"
                                >
                                  <Eye className="w-4 h-4" />
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

      <ProcessSelector
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        onSelect={handleProcessSelect}
        onCreateNew={handleCreateNew}
        usuario={config.usuario}
        value={selectedProcessName ? taskMapping[selectedProcessName] : undefined}
      />

      <SQLPreviewModal
        open={previewProcess !== null || isCreateNewOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewProcess(null);
            setIsCreateNewOpen(false);
            setCreateNewFases([]);
            setCreateNewProject(null);
          }
        }}
        taskData={previewProcess ? {
          name: previewProcess.name,
          fechaInicio: previewProcess.fechaInicio,
          fechaFin: previewProcess.fechaFin,
          totalMinutes: previewProcess.totalMinutes || 0,
        } : null}
        fases={isCreateNewOpen ? createNewFases : undefined}
        selectedProject={isCreateNewOpen ? createNewProject : undefined}
        config={{
          usuario: config.usuario,
          fase: config.fase,
        }}
        title="Crear Proceso"
        onExecute={(dto) => createProcess.mutateAsync(dto)}
        isExecuting={createProcess.isPending}
        executeResult={createProcess.data ? {
          success: true,
          message: createProcess.data.message,
          totalRowsAffected: createProcess.data.totalRowsAffected,
        } : createProcess.error ? {
          success: false,
          message: (createProcess.error as Error).message,
        } : null}
      />
    </>
  );
}
