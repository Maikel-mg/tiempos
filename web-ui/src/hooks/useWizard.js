import { useState, useCallback } from 'react';
import { parseCSV, findColumnIndices, validateRequiredColumns, extractUniqueTasks } from '@/lib/csv-parser';
import { generateSQL } from '@/lib/sql-generator';

const DEFAULT_CONFIG = {
    usuario: '',
    tipoHora: '11',
    teletrabajo: '0',
    encoding: 'utf8'
};

export function useWizard() {
    // Wizard state
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Data state
    const [file, setFile] = useState(null);
    const [csvData, setCsvData] = useState(null);
    const [columnIndices, setColumnIndices] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [taskMapping, setTaskMapping] = useState({});
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [sqlResult, setSqlResult] = useState(null);

    // Upload handlers
    const handleFileUpload = useCallback(async (uploadedFile) => {
        setIsLoading(true);
        setError(null);
        
        try {
            if (!uploadedFile.name.endsWith('.csv') && !uploadedFile.name.endsWith('.txt')) {
                throw new Error('El archivo debe ser CSV (.csv o .txt)');
            }

            const data = await parseCSV(uploadedFile, config.encoding);
            const indices = findColumnIndices(data.headers);
            const missingColumns = validateRequiredColumns(indices);
            
            if (missingColumns) {
                throw new Error(`Columnas requeridas no encontradas: ${missingColumns.join(', ')}`);
            }

            const uniqueTasks = extractUniqueTasks(data.rows, indices.tarea);
            
            // Initialize task mapping with empty IDs
            const initialMapping = {};
            uniqueTasks.forEach(task => {
                initialMapping[task] = '';
            });

            setFile(uploadedFile);
            setCsvData(data);
            setColumnIndices(indices);
            setTasks(uniqueTasks);
            setTaskMapping(initialMapping);
            setStep(2);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [config.encoding]);

    // Task mapping handlers
    const updateTaskId = useCallback((taskName, taskId) => {
        setTaskMapping(prev => ({
            ...prev,
            [taskName]: taskId
        }));
    }, []);

    const validateTaskMapping = useCallback(() => {
        const errors = [];
        let emptyCount = 0;
        let invalidCount = 0;

        Object.entries(taskMapping).forEach(([task, id]) => {
            if (!id || id.trim() === '') {
                emptyCount++;
            } else if (!/^[1-9]\d*$/.test(id)) {
                invalidCount++;
                errors.push({
                    task: task.length > 40 ? task.substring(0, 40) + '...' : task,
                    error: 'El ID debe ser un número entero positivo'
                });
            }
        });

        return {
            isValid: emptyCount === 0 && invalidCount === 0,
            emptyCount,
            invalidCount,
            errors
        };
    }, [taskMapping]);

    // Generate SQL
    const handleGenerateSQL = useCallback(() => {
        setIsLoading(true);
        setError(null);
        
        try {
            const validation = validateTaskMapping();
            if (!validation.isValid) {
                const errorMsg = [];
                if (validation.emptyCount > 0) {
                    errorMsg.push(`${validation.emptyCount} tarea(s) sin ID asignado`);
                }
                if (validation.invalidCount > 0) {
                    errorMsg.push(`${validation.invalidCount} ID(s) inválido(s)`);
                }
                throw new Error(errorMsg.join(', '));
            }

            // Convert taskMapping IDs to numbers
            const numericMapping = {};
            Object.entries(taskMapping).forEach(([task, id]) => {
                numericMapping[task] = parseInt(id);
            });

            const result = generateSQL({
                rows: csvData.rows,
                headers: csvData.headers,
                taskMapping: numericMapping,
                config,
                indices: columnIndices
            });

            setSqlResult(result);
            setStep(3);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [csvData, taskMapping, config, columnIndices, validateTaskMapping]);

    // Navigation
    const goToStep = useCallback((targetStep) => {
        if (targetStep === 1) {
            // Reset to step 1
            setStep(1);
            setCsvData(null);
            setTasks([]);
            setTaskMapping({});
            setSqlResult(null);
            setError(null);
        } else if (targetStep === 2 && csvData) {
            setStep(2);
            setSqlResult(null);
            setError(null);
        } else if (targetStep === 3 && sqlResult) {
            setStep(3);
            setError(null);
        }
    }, [csvData, sqlResult]);

    const updateConfig = useCallback((key, value) => {
        setConfig(prev => ({
            ...prev,
            [key]: value
        }));
    }, []);

    const resetWizard = useCallback(() => {
        setStep(1);
        setFile(null);
        setCsvData(null);
        setColumnIndices(null);
        setTasks([]);
        setTaskMapping({});
        setConfig(DEFAULT_CONFIG);
        setSqlResult(null);
        setError(null);
        setIsLoading(false);
    }, []);

    return {
        // State
        step,
        isLoading,
        error,
        file,
        csvData,
        columnIndices,
        tasks,
        taskMapping,
        config,
        sqlResult,
        
        // Computed
        totalRows: csvData?.rows?.length || 0,
        uniqueTaskCount: tasks.length,
        mappedTaskCount: Object.values(taskMapping).filter(id => id && /^[1-9]\d*$/.test(id)).length,
        
        // Actions
        handleFileUpload,
        updateTaskId,
        validateTaskMapping,
        handleGenerateSQL,
        goToStep,
        updateConfig,
        resetWizard,
        setError
    };
}
