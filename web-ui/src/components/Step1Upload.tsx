import * as React from 'react';
import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

function isValidFileType(file: File | null): boolean {
    if (!file) return false;
    return file.name.endsWith('.csv') || file.name.endsWith('.txt');
}

export interface Step1UploadProps {
    onFileUpload: (file: File) => void;
    isLoading: boolean;
    error: string | null;
    config: {
        usuario: string;
        fase: string;
        tipoHora: string;
    };
    onUpdateConfig: (key: string, value: string) => void;
}

export function Step1Upload({ 
    onFileUpload, 
    isLoading, 
    error, 
    config, 
    onUpdateConfig 
}: Step1UploadProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
                setSelectedFile(file);
            }
        }
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!isValidFileType(file)) {
                setFileError('Tipo de archivo inválido. Solo se aceptan archivos .csv o .txt');
                setSelectedFile(null);
                e.target.value = '';
                return;
            }
            setFileError(null);
            setSelectedFile(file);
        }
    }, []);

    const handleUpload = useCallback(() => {
        if (selectedFile) {
            if (!isValidFileType(selectedFile)) {
                setFileError('Tipo de archivo inválido. Solo se aceptan archivos .csv o .txt');
                return;
            }
            setFileError(null);
            onFileUpload(selectedFile);
        }
    }, [selectedFile, onFileUpload]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        Subir Archivo CSV
                    </CardTitle>
                    <CardDescription>
                        Arrastra y suelta tu archivo CSV o selecciónalo manualmente
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
            {/* Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                    <Label htmlFor="usuario">Usuario</Label>
                    <Input
                        id="usuario"
                        value={config.usuario}
                        onChange={(e) => onUpdateConfig('usuario', e.target.value)}
                        placeholder="MG01"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="fase">Fase (ID)</Label>
                    <Input
                        id="fase"
                        type="number"
                        value={config.fase}
                        onChange={(e) => onUpdateConfig('fase', e.target.value)}
                        placeholder="38653"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="tipoHora">Tipo de Hora</Label>
                    <Input
                        id="tipoHora"
                        type="number"
                        value={config.tipoHora}
                        onChange={(e) => onUpdateConfig('tipoHora', e.target.value)}
                        placeholder="11"
                    />
                </div>
            </div>

                    <Separator />

                    {/* Drop Zone */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`
                            relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
                            ${isDragOver 
                                ? 'border-primary bg-primary/5' 
                                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                            }
                        `}
                    >
                        <div className="flex flex-col items-center gap-3">
                            <div className={`
                                p-4 rounded-full transition-colors
                                ${isDragOver ? 'bg-primary text-primary-foreground' : 'bg-muted'}
                            `}>
                                <Upload className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">
                                    {isDragOver ? 'Suelta el archivo aquí' : 'Arrastra tu archivo CSV aquí'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    o haz clic para seleccionar
                                </p>
                            </div>
                            <Input
                                type="file"
                                accept=".csv,.txt"
                                onChange={handleFileSelect}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Selected File */}
                    {selectedFile && (
                        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                            <FileText className="w-5 h-5 text-primary" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                    {selectedFile.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {(selectedFile.size / 1024).toFixed(2)} KB
                                </p>
                            </div>
                            <Badge variant="success" className="flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Listo
                            </Badge>
                        </div>
                    )}

                    {/* Error Alert */}
                    {fileError && (
                        <Alert variant="destructive">
                            <AlertCircle className="w-4 h-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{fileError}</AlertDescription>
                        </Alert>
                    )}

                    {/* Server Error Alert */}
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="w-4 h-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Upload Button */}
                    <Button 
                        onClick={handleUpload} 
                        disabled={!selectedFile || isLoading}
                        className="w-full"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4 mr-2" />
                                Procesar Archivo
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="bg-muted/30">
                <CardHeader>
                    <CardTitle className="text-base">Requisitos del archivo</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-green-500 mt-0.5" />
                            Formato: CSV con separador TAB o coma
                        </li>
                        <li className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-green-500 mt-0.5" />
                            Columnas requeridas: Tarea, Fecha de inicio, Hora de inicio, Fecha de finalización, Hora de finalización, Duración (decimal)
                        </li>
                        <li className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-green-500 mt-0.5" />
                            Codificación: UTF-8 recomendada
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
