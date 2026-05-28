import { useState, useEffect, useMemo } from 'react';
import { Copy, Play, Loader2, Check, AlertCircle, Calendar, Clock, Flag, Edit2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { generateTaskSQL, formatISOToSQLDate } from '@/lib/sql-generator';
import { SinFasesSelector } from './SinFasesSelector';
import type { Project } from '@/features/projects/types';

export interface SQLPreviewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    taskData?: any;
    config: {
        usuario: string;
        fase: string;
    } | null;
    fases?: Array<{ id: string; label: string }>;
    selectedProject?: Project | null;
    title?: string;
    onExecute?: (sql: string) => void;
    isExecuting?: boolean;
    executeResult?: any;
}

export function SQLPreviewModal({ 
    open, 
    onOpenChange, 
    taskData,
    config,
    fases,
    title = 'Vista Previa SQL',
    onExecute,
    isExecuting = false,
    executeResult = null,
    selectedProject,
}: SQLPreviewModalProps) {
    const [copied, setCopied] = useState(false);
    const [editedTask, setEditedTask] = useState<any>(null);

    // Initialize edited task when modal opens or taskData changes
    useEffect(() => {
        if (open) {
            if (taskData) {
                // Convert ISO dates to DD/MM/YYYY if needed
                const toDDMMYYYY = (dateStr: string): string => {
                    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
                    return formatISOToSQLDate(dateStr) || dateStr;
                };
                setEditedTask({
                    nombre: taskData.name || taskData.nombre,
                    fechaInicio: toDDMMYYYY(taskData.fechaInicio),
                    fechaFin: toDDMMYYYY(taskData.fechaFin),
                    minutos: taskData.totalMinutes || taskData.minutos || 0,
                    usuario: config?.usuario || '',
                    fase: fases ? config?.fase || '' : ''  // No pre-fill fase in sin-fases mode
                });
            } else {
                // Initialize with defaults when taskData is null/undefined
                const today = new Date();
                const formatDate = (date: Date): string => {
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const year = date.getFullYear();
                    return `${day}/${month}/${year}`;
                };
                const nextWeek = new Date(today);
                nextWeek.setDate(today.getDate() + 7);
                setEditedTask({
                    nombre: '',
                    fechaInicio: formatDate(today),
                    fechaFin: formatDate(nextWeek),
                    minutos: 0,
                    usuario: config?.usuario || '',
                    fase: fases ? config?.fase || '' : ''  // No pre-fill fase in sin-fases mode
                });
            }
        }
    }, [open, taskData, config, fases]);

    // Generate SQL based on edited data
    const sql = useMemo(() => {
        console.log(`TCL ~ SQLPreviewModal ~ editedTask:`, editedTask)
        if (!editedTask) return '';
        try {
            return generateTaskSQL(editedTask);
        } catch (error: any) {
            return `-- Error generating SQL: ${error.message}`;
        }
    }, [editedTask]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(sql);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleParamChange = (field: string, value: string | number) => {
        setEditedTask((prev: any) => ({
            ...prev,
            [field]: value
        }));
    };

    const handleMinutesChange = (hours: string) => {
        const val = hours === '' ? 0 : parseFloat(hours);
        const mins = Math.round(val * 60);
        handleParamChange('minutos', mins);
    };

    const isDateValid = (dateStr: string | undefined | null) => {
        if (!dateStr) return false;
        return /^\d{2}\/\d{2}\/\d{4}$/.test(dateStr);
    };

    const isValid = editedTask && 
                    isDateValid(editedTask.fechaInicio) && 
                    isDateValid(editedTask.fechaFin) && 
                    !isNaN(editedTask.minutos) &&
                    !!editedTask?.fase?.trim();

    const currentHours = editedTask ? (editedTask.minutos / 60) : 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-hidden flex flex-col gap-4">
                    {/* Row 1: Proyecto + Fase */}
                    <div className="p-4 bg-muted/30 rounded-lg border" data-testid="row-proyecto-fase">
                        {!fases ? (
                            <SinFasesSelector
                                config={config}
                                onTaskChange={(updates) => {
                                    console.log(`TCL ~ SQLPreviewModal ~ updates:`, updates)
                                    Object.entries(updates).forEach(([key, value]) => {
                                        handleParamChange(key, value);
                                    });
                                }}
                                disabled={isExecuting}
                            />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Edit2 className="w-4 h-4" />
                                        Proyecto
                                    </Label>
                                    {selectedProject ? (
                                        <div
                                            className="bg-muted/50 border rounded-md p-2 text-sm"
                                            data-testid="project-info-display"
                                        >
                                            {selectedProject.NomCliente} / {selectedProject.NomProy} ({selectedProject.Proyecto})
                                        </div>
                                    ) : (
                                        <Input
                                            value={editedTask?.usuario || ''}
                                            onChange={(e) => handleParamChange('proyecto', e.target.value)}
                                            placeholder="Código de proyecto sin espacios"
                                            className="w-full"
                                        />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2">
                                        <Flag className="w-4 h-4" />
                                        Fase <span className="text-destructive">*</span>
                                    </Label>
                                    {fases && fases.length > 0 ? (
                                        <Select 
                                            value={editedTask?.fase || ''} 
                                            onValueChange={(value: string) => handleParamChange('fase', value)}
                                        >
                                            <SelectTrigger aria-invalid={!editedTask?.fase?.trim()}>
                                                <SelectValue placeholder="Selecciona una fase" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {fases.map((fase: { id: string; label: string }) => (
                                                    <SelectItem key={fase.id} value={fase.id}>
                                                        {fase.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input 
                                            value={editedTask?.fase || ''}
                                            onChange={(e) => handleParamChange('fase', e.target.value)}
                                            placeholder="Código de fase"
                                            aria-invalid={!editedTask?.fase?.trim()}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Row 2: Nombre de la tarea */}
                    <div className="p-4 bg-muted/30 rounded-lg border" data-testid="row-nombre">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Edit2 className="w-4 h-4" />
                                Nombre de la tarea
                            </Label>
                            <Input
                                value={editedTask?.nombre || ''}
                                onChange={(e) => handleParamChange('nombre', e.target.value)}
                                placeholder="Descripción de la tarea"
                                className="w-full"
                            />
                        </div>
                    </div>

                    {/* Row 3: Fecha inicio + Fecha fin */}
                    <div className="p-4 bg-muted/30 rounded-lg border" data-testid="row-fechas">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Calendar className={`w-4 h-4 ${!isDateValid(editedTask?.fechaInicio) ? 'text-destructive' : ''}`} />
                                    Fecha Inicio (DD/MM/AAAA)
                                </Label>
                                <Input 
                                    value={editedTask?.fechaInicio || ''} 
                                    onChange={(e) => handleParamChange('fechaInicio', e.target.value)}
                                    placeholder="DD/MM/AAAA"
                                    className={!isDateValid(editedTask?.fechaInicio) ? 'border-destructive' : ''}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Calendar className={`w-4 h-4 ${!isDateValid(editedTask?.fechaFin) ? 'text-destructive' : ''}`} />
                                    Fecha Fin (DD/MM/AAAA)
                                </Label>
                                <Input 
                                    value={editedTask?.fechaFin || ''} 
                                    onChange={(e) => handleParamChange('fechaFin', e.target.value)}
                                    placeholder="DD/MM/AAAA"
                                    className={!isDateValid(editedTask?.fechaFin) ? 'border-destructive' : ''}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Row 4: Horas estimadas */}
                    <div className="p-4 bg-muted/30 rounded-lg border" data-testid="row-horas">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Horas Estimadas
                            </Label>
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="number"
                                    step="0.25"
                                    value={currentHours} 
                                    onChange={(e) => handleMinutesChange(e.target.value)}
                                    className="w-full"
                                />
                                <span className="text-sm text-muted-foreground whitespace-nowrap">
                                    ({editedTask?.minutos || 0} min)
                                </span>
                            </div>
                        </div>
                    </div>

                    {executeResult && (
                        <Alert variant={executeResult.success ? 'default' : 'destructive'}>
                            {executeResult.success ? (
                                <Check className="w-4 h-4" />
                            ) : (
                                <AlertCircle className="w-4 h-4" />
                            )}
                            <AlertTitle>
                                {executeResult.success ? 'Ejecución exitosa' : 'Error'}
                            </AlertTitle>
                            <AlertDescription>
                                {executeResult.message}
                                {executeResult.totalRowsAffected !== undefined && (
                                    <p className="mt-1">Filas afectadas: {executeResult.totalRowsAffected}</p>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                    <ScrollArea className="flex-1 border rounded-lg bg-slate-950">
                        <pre className="p-4 text-sm font-mono whitespace-pre-wrap text-slate-300" data-testid="sql-preview">
                            {sql}
                        </pre>
                    </ScrollArea>

                    <div className="flex gap-2 justify-end pt-2">
                        <Button variant="outline" onClick={handleCopy}>
                            {copied ? (
                                <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Copiado
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copiar SQL
                                </>
                            )}
                        </Button>
                        {onExecute && (
                            <Button 
                                onClick={() => onExecute(sql)}
                                disabled={isExecuting || !isValid}
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
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
