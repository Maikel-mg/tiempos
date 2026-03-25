import { useState, useEffect, useMemo } from 'react';
import { Copy, Play, Loader2, Check, AlertCircle, Calendar, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { generateTaskSQL } from '@/lib/sql-generator';

export interface SQLPreviewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    taskData: any;
    config: {
        usuario: string;
        fase: string;
    } | null;
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
    title = 'Vista Previa SQL',
    onExecute,
    isExecuting = false,
    executeResult = null
}: SQLPreviewModalProps) {
    const [copied, setCopied] = useState(false);
    const [editedTask, setEditedTask] = useState<any>(null);

    // Initialize edited task when modal opens or taskData changes
    useEffect(() => {
        if (open && taskData) {
            setEditedTask({
                nombre: taskData.name || taskData.nombre,
                fechaInicio: taskData.fechaInicio,
                fechaFin: taskData.fechaFin,
                minutos: taskData.totalMinutes || taskData.minutos || 0,
                usuario: config?.usuario || '',
                fase: config?.fase || ''
            });
        }
    }, [open, taskData, config]);

    // Generate SQL based on edited data
    const sql = useMemo(() => {
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
                    !isNaN(editedTask.minutos);

    const currentHours = editedTask ? (editedTask.minutos / 60) : 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-hidden flex flex-col gap-4">
                    {/* Editable Parameters */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg border">
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
                        <pre className="p-4 text-sm font-mono whitespace-pre-wrap text-slate-300">
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
