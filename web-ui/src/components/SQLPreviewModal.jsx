import { useState } from 'react';
import { X, Copy, Play, Loader2, Check, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export function SQLPreviewModal({ 
    open, 
    onOpenChange, 
    sql, 
    title = 'Vista Previa SQL',
    onExecute,
    isExecuting = false,
    executeResult = null
}) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(sql);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
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

                    <ScrollArea className="h-[400px] border rounded-lg">
                        <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
                            {sql}
                        </pre>
                    </ScrollArea>

                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={handleCopy}>
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
                        {onExecute && (
                            <Button 
                                onClick={onExecute}
                                disabled={isExecuting}
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
