import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProcessSelector } from '@/features/process-management/components/ProcessSelector';
import { updateMapping } from '@/lib/task-mapping-storage';
import { Eye } from 'lucide-react';
import { SQLPreviewModal } from '@/components/SQLPreviewModal';
import { useCreateProcess } from '@/features/process-management/mutations/useCreateProcess';
import type { TaskProposal } from '@/domain/proposals/extract-proposals';
import type { ProcessConfig } from '@/features/process-management/types';

export interface TaskProposalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposals: TaskProposal[];
  onAccept: (proposal: TaskProposal, proposedName: string, processId: string) => void;
  config: ProcessConfig;
}

interface RowState {
  proposedName: string;
  processId: string;
}

function getProposalKey(p: TaskProposal): string {
  return `${p.genericTask}|||${p.description}|||${p.projectCode}`;
}

export function TaskProposalModal({
  open,
  onOpenChange,
  proposals,
  onAccept,
  config,
}: TaskProposalModalProps) {
  const [rowsState, setRowsState] = useState<Record<string, RowState>>({});
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [activeRowKey, setActiveRowKey] = useState<string | null>(null);
  const [previewProposal, setPreviewProposal] = useState<TaskProposal | null>(null);

  const createProcess = useCreateProcess();

  // Initialize rowsState from proposals
  useEffect(() => {
    if (!open) return;

    const initial: Record<string, RowState> = {};
    for (const p of proposals) {
      const key = getProposalKey(p);
      initial[key] = {
        proposedName: p.proposedName,
        processId: '',
      };
    }
    setRowsState(initial);
  }, [proposals, open]);

  const handleProposedNameChange = (key: string, value: string) => {
    setRowsState(prev => ({
      ...prev,
      [key]: { ...prev[key], proposedName: value },
    }));
  };

  const handleOpenSelector = (key: string) => {
    setActiveRowKey(key);
    setSelectorOpen(true);
  };

  const handleProcessSelect = (_projectCode: string, processId: string) => {
    if (activeRowKey === null) return;

    setRowsState(prev => ({
      ...prev,
      [activeRowKey]: { ...prev[activeRowKey], processId },
    }));

    const row = rowsState[activeRowKey];
    if (row) {
      updateMapping(row.proposedName, processId);
    }

    const proposal = proposals.find(p => getProposalKey(p) === activeRowKey);
    if (proposal && row) {
      onAccept(proposal, row.proposedName, processId);
    }

    setSelectorOpen(false);
    setActiveRowKey(null);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-2xl font-bold">Seleccionar ID de Tarea</DialogTitle>
        </DialogHeader>

        <div className="py-6">
          {proposals.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 text-lg">No hay propuestas pendientes</p>
          ) : (
            <div className="space-y-4">
              <ScrollArea className="h-[500px] border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="text-base font-semibold">Descripción</TableHead>
                      <TableHead className="text-base font-semibold">Tarea Genérica</TableHead>
                      <TableHead className="text-base font-semibold">Horas</TableHead>
                      <TableHead className="text-base font-semibold">Nombre Propuesto</TableHead>
                      <TableHead className="text-base font-semibold">Acciones</TableHead>
                      <TableHead className="text-base font-semibold">Vista Previa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proposals.map((proposal) => {
                      const key = getProposalKey(proposal);
                      const rowState = rowsState[key] || { proposedName: proposal.proposedName, processId: '' };
                      return (
                        <TableRow key={key} className="hover:bg-muted/50">
                          <TableCell className="py-4">{proposal.description}</TableCell>
                          <TableCell className="py-4 font-medium">{proposal.genericTask}</TableCell>
                          <TableCell className="py-4 font-semibold">{proposal.totalHours}h</TableCell>
                          <TableCell className="py-4">
                            <Input
                              value={rowState.proposedName}
                              onChange={(e) => handleProposedNameChange(key, e.target.value)}
                              className="text-base"
                            />
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex gap-2">
                              <Input value={rowState.processId} readOnly placeholder="ID de proceso" className="text-base" />
                              <Button onClick={() => handleOpenSelector(key)} size="default">Seleccionar Proceso</Button>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 text-muted-foreground hover:text-primary"
                              onClick={() => setPreviewProposal({ ...proposal, proposedName: rowState.proposedName })}
                              title="Previsualizar SQL de Creación"
                            >
                              <Eye className="w-5 h-5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </div>

        {selectorOpen && (
          <ProcessSelector
            open={selectorOpen}
            onOpenChange={setSelectorOpen}
            onSelect={handleProcessSelect}
            usuario={config.usuario}
          />
        )}
      </DialogContent>
    </Dialog>

    <SQLPreviewModal
      open={previewProposal !== null}
      onOpenChange={(open) => {
        if (!open) setPreviewProposal(null);
      }}
      taskData={previewProposal ? {
        name: previewProposal.proposedName,
        fechaInicio: previewProposal.fechaInicio,
        fechaFin: previewProposal.fechaFin,
        totalMinutes: Math.round(previewProposal.totalHours * 60),
      } : null}
      config={{
        usuario: config.usuario,
        fase: config.fase,
      }}
      title="Vista Previa - Crear Proceso"
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
