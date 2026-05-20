import * as React from 'react';

import { FileSpreadsheet, CheckCircle2, Database } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useImportWizard } from '@/features/import-csv/hooks/use-import-wizard';
import { Step1Upload } from '@/features/import-csv/components/Step1Upload';
import { Step2Tasks } from '@/features/import-csv/components/Step2Tasks';
import { Step3Preview } from '@/features/import-csv/components/Step3Preview';
import { ConfigInfoBar } from '@/components/ConfigInfoBar';

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
                        <ConfigInfoBar />
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
                        dbConfig={{ server: '', database: '', username: '', password: '' }}
                    />
                );
            case 3:
                return (
                    <Step3Preview
                        sqlResult={_raw.sqlResult as any}
                        onBack={() => goToStep('mapping')}
                        onReset={reset}
                        fileName={file?.name}
                        dbConfig={{ server: '', database: '', username: '', password: '' }}
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
        <div className="container mx-auto px-4 py-8">
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
        </div>
    );
}
