import { useState } from 'react';
import { ArrowLeft, Copy, Download, Check, FileCode, AlertCircle, RefreshCcw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { downloadSQL, formatSQLForHighlight } from '@/lib/sql-generator';

export function Step3Preview({
    sqlResult,
    onBack,
    onReset,
    fileName
}) {
    const [copied, setCopied] = useState(false);
    const [showRaw, setShowRaw] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(sqlResult.sql);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Error al copiar:', err);
        }
    };

    const handleDownload = () => {
        const outputName = fileName?.replace('.csv', '.sql').replace('.txt', '.sql') || 'tiempos.sql';
        downloadSQL(sqlResult.sql, outputName);
    };

    // Calculate stats
    const hasErrors = sqlResult.errors.length > 0;
    const errorRate = sqlResult.total > 0 
        ? Math.round((sqlResult.errors.length / sqlResult.total) * 100) 
        : 0;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <FileCode className="w-5 h-5" />
                                SQL Generado
                            </CardTitle>
                            <CardDescription>
                                Vista previa de las sentencias SQL generadas
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Badge variant={hasErrors ? "warning" : "success"}>
                                {sqlResult.processed} éxitos
                            </Badge>
                            {hasErrors && (
                                <Badge variant="destructive">
                                    {sqlResult.errors.length} errores
                                </Badge>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <p className="text-2xl font-bold text-green-600">
                                {sqlResult.processed}
                            </p>
                            <p className="text-xs text-muted-foreground">Procesados</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <p className={`text-2xl font-bold ${hasErrors ? 'text-destructive' : 'text-green-600'}`}>
                                {sqlResult.errors.length}
                            </p>
                            <p className="text-xs text-muted-foreground">Errores</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <p className="text-2xl font-bold">{sqlResult.total}</p>
                            <p className="text-xs text-muted-foreground">Total</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <p className={`text-2xl font-bold ${errorRate > 10 ? 'text-destructive' : errorRate > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                                {errorRate}%
                            </p>
                            <p className="text-xs text-muted-foreground">Tasa error</p>
                        </div>
                    </div>

                    <Separator />

                    {/* Success/Error Alerts */}
                    {hasErrors ? (
                        <Alert variant="warning">
                            <AlertCircle className="w-4 h-4" />
                            <AlertTitle>Algunos registros no se pudieron procesar</AlertTitle>
                            <AlertDescription>
                                <p className="mt-1">
                                    Se generaron {sqlResult.processed} sentencias SQL correctamente, pero {sqlResult.errors.length} registros tuvieron errores.
                                </p>
                                {sqlResult.errors.length > 0 && (
                                    <details className="mt-2">
                                        <summary className="cursor-pointer text-sm font-medium">
                                            Ver detalles de errores ({sqlResult.errors.length})
                                        </summary>
                                        <ul className="mt-2 space-y-1 text-sm max-h-32 overflow-y-auto">
                                            {sqlResult.errors.slice(0, 10).map((err, idx) => (
                                                <li key={idx} className="text-destructive">
                                                    Línea {err.line}: {err.message}
                                                </li>
                                            ))}
                                            {sqlResult.errors.length > 10 && (
                                                <li className="text-muted-foreground italic">
                                                    ... y {sqlResult.errors.length - 10} errores más
                                                </li>
                                            )}
                                        </ul>
                                    </details>
                                )}
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <Alert variant="success">
                            <Check className="w-4 h-4" />
                            <AlertTitle>Todas las sentencias generadas correctamente</AlertTitle>
                            <AlertDescription>
                                Se generaron {sqlResult.processed} sentencias SQL sin errores.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* SQL Preview */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Vista previa SQL</Label>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowRaw(!showRaw)}
                                >
                                    {showRaw ? 'Formato' : 'Sin formato'}
                                </Button>
                            </div>
                        </div>
                        
                        <ScrollArea className="h-[400px] border rounded-lg">
                            {showRaw ? (
                                <Textarea
                                    value={sqlResult.sql}
                                    readOnly
                                    className="h-full min-h-[400px] font-mono text-sm resize-none border-0 focus-visible:ring-0"
                                />
                            ) : (
                                <div 
                                    className="p-4 font-mono text-sm whitespace-pre-wrap"
                                    dangerouslySetInnerHTML={{ 
                                        __html: formatSQLForHighlight(sqlResult.sql) 
                                    }}
                                />
                            )}
                        </ScrollArea>
                    </div>

                    {/* First Statement Preview */}
                    {sqlResult.statements.length > 0 && (
                        <div className="p-4 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-2">
                                Ejemplo del primer registro:
                            </p>
                            <code className="text-xs text-muted-foreground break-all">
                                {sqlResult.statements[0].substring(0, 150)}...
                            </code>
                        </div>
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
                            disabled={copied}
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
                        <Button onClick={handleDownload}>
                            <Download className="w-4 h-4 mr-2" />
                            Descargar .sql
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}

// Helper component for Label
function Label({ children, className }) {
    return (
        <label className={`text-sm font-medium leading-none ${className}`}>
            {children}
        </label>
    );
}
