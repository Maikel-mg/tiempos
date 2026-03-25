import * as React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, CheckCircle2, Database, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useImportWizard } from '@/features/import-csv/hooks/use-import-wizard';
import { Step1Upload } from '@/features/import-csv/components/Step1Upload';
import { Step2Tasks } from '@/features/import-csv/components/Step2Tasks';
import { Step3Preview } from '@/features/import-csv/components/Step3Preview';
import { DBConnection, type DbConfig } from '@/components/DBConnection';

interface StepIndicatorProps {
    currentStep: number;
    step: number;
    label: string;
    icon: React.ElementType;
}

function StepIndicator({ currentStep, step, label, icon: Icon }: StepIndicatorProps) {
    const isActive = currentStep === step;
    const isCompleted = currentStep > step;
    const isPending = currentStep < step;

    return (
        <div className={`
            flex items-center gap-3 px-4 py-2 rounded-lg transition-all
            ${isActive ? 'bg-primary/10 text-primary' : ''}
            ${isCompleted ? 'text-green-600' : ''}
            ${isPending ? 'text-muted-foreground' : ''}
        `}>
            <div className={`
                flex items-center justify-center w-8 h-8 rounded-full border-2
                ${isActive ? 'border-primary bg-primary text-primary-foreground' : ''}
                ${isCompleted ? 'border-green-500 bg-green-500 text-white' : ''}
                ${isPending ? 'border-muted-foreground/30' : ''}
            `}>
                {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                ) : (
                    <Icon className="w-4 h-4" />
                )}
            </div>
            <div className="hidden sm:block">
                <p className="text-sm font-medium">Paso {step}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
            </div>
        </div>
    );
}

export function ImportCsvPage() {
    const navigate = useNavigate();
    
    const [dbConfig, setDbConfig] = useState<DbConfig>({
        server: '',
        database: '',
        username: '',
        password: ''
    });

    const {
        step,
        isLoading,
        error,
        uploadFile,
        setTaskId,
        generateSQL,
        goToStep,
        reset,
        totalRows,
        mappedTasks,
        getTasks,
        _raw
    } = useImportWizard();

    const { config, updateConfig, selectedRows, setSelectedRows, csvData, file, columnIndices, taskMapping } = _raw;

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <>
                        <DBConnection 
                            dbConfig={dbConfig} 
                            onUpdateDbConfig={setDbConfig} 
                        />
                        <Step1Upload
                            onFileUpload={uploadFile}
                            isLoading={isLoading}
                            error={error}
                            config={config}
                            onUpdateConfig={updateConfig}
                        />
                    </>
                );
            case 2:
                return (
                    <Step2Tasks
                        tasks={getTasks()}
                        taskMapping={taskMapping}
                        suggestedTasks={{}} // Should be from state if needed
                        onUpdateTaskId={setTaskId}
                        onGenerateSQL={generateSQL}
                        onBack={() => goToStep('upload')}
                        isLoading={isLoading}
                        error={error}
                        totalRows={totalRows}
                        mappedTaskCount={mappedTasks}
                        csvData={csvData}
                        selectedRows={selectedRows}
                        setSelectedRows={setSelectedRows}
                        config={config}
                        dbConfig={dbConfig}
                    />
                );
            case 3:
                return (
                    <Step3Preview
                        sqlResult={_raw.sqlResult as any}
                        onBack={() => goToStep('mapping')}
                        onReset={reset}
                        fileName={file?.name}
                        dbConfig={dbConfig}
                        csvData={csvData}
                        selectedRows={selectedRows}
                        setSelectedRows={setSelectedRows}
                        config={config}
                        taskMapping={taskMapping}
                        columnIndices={columnIndices}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b bg-card">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => navigate('/')}
                                className="mr-2"
                            >
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                Volver
                            </Button>
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <FileSpreadsheet className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">Importador de Tiempos</h1>
                                <p className="text-sm text-muted-foreground">
                                    Importar desde CSV
                                </p>
                            </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            v1.0.0
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                {/* Step Indicator */}
                <Card className="mb-8">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-center gap-2 sm:gap-8">
                            <StepIndicator
                                currentStep={step}
                                step={1}
                                label="Subir CSV"
                                icon={FileSpreadsheet}
                            />
                            <Separator className="w-8 sm:w-16" />
                            <StepIndicator
                                currentStep={step}
                                step={2}
                                label="Asignar Tareas"
                                icon={CheckCircle2}
                            />
                            <Separator className="w-8 sm:w-16" />
                            <StepIndicator
                                currentStep={step}
                                step={3}
                                label="Generar SQL"
                                icon={Database}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Step Content */}
                <div className="max-w-7xl mx-auto">
                    {renderStep()}
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t mt-auto">
                <div className="container mx-auto px-4 py-4">
                    <p className="text-center text-sm text-muted-foreground">
                        Funciona completamente en el navegador • Sin servidor necesario
                    </p>
                </div>
            </footer>
        </div>
    );
}
