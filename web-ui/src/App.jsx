import { useState } from 'react';
import { FileSpreadsheet, CheckCircle2, Circle, Database } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useWizard } from '@/hooks/useWizard';
import { Step1Upload } from '@/components/Step1Upload';
import { Step2Tasks } from '@/components/Step2Tasks';
import { Step3Preview } from '@/components/Step3Preview';
import { DBConnection } from '@/components/DBConnection';

function StepIndicator({ currentStep, step, label, icon: Icon }) {
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

function App() {
    const [dbConfig, setDbConfig] = useState({
        server: '',
        database: '',
        username: '',
        password: ''
    });

    const {
        step,
        isLoading,
        error,
        file,
        csvData,
        tasks,
        taskMapping,
        config,
        sqlResult,
        totalRows,
        mappedTaskCount,
        handleFileUpload,
        updateTaskId,
        handleGenerateSQL,
        goToStep,
        updateConfig,
        resetWizard,
        setError,
        selectedRows,
        setSelectedRows
    } = useWizard();

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
                            onFileUpload={handleFileUpload}
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
                        tasks={tasks}
                        taskMapping={taskMapping}
                        onUpdateTaskId={updateTaskId}
                        onGenerateSQL={handleGenerateSQL}
                        onBack={() => goToStep(1)}
                        isLoading={isLoading}
                        error={error}
                        totalRows={totalRows}
                        mappedTaskCount={mappedTaskCount}
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
                        sqlResult={sqlResult}
                        onBack={() => goToStep(2)}
                        onReset={resetWizard}
                        fileName={file?.name}
                        dbConfig={dbConfig}
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
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <FileSpreadsheet className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">Importador de Tiempos</h1>
                                <p className="text-sm text-muted-foreground">
                                    CSV a SQL Server
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

export default App;
