import { useState, useCallback, useMemo } from 'react';
import { findColumnIndices, validateRequiredColumns, extractUniqueTasks, type CSVIndices, type ParsedData, type UniqueTask } from '@/lib/csv-parser';
import { CSVParserAdapter, TaskStorageAdapter, SQLGeneratorAdapter } from './adapters';
import type { CSVParserPort, TaskStoragePort, SQLGeneratorPort, SQLResult } from './ports';

export interface WizardConfig {
  usuario: string;
  fase: string;
  tipoHora: string;
  encoding: string;
  [key: string]: string;
}

export interface WizardAdapters {
  csvParser: CSVParserPort;
  taskStorage: TaskStoragePort;
  sqlGenerator: SQLGeneratorPort;
}

export interface WizardOptions {
  initialConfig?: Partial<WizardConfig>;
  adapters?: WizardAdapters;
}

const DEFAULT_CONFIG: WizardConfig = {
  usuario: '',
  fase: '',
  tipoHora: '11',
  encoding: 'utf8'
};

const DEFAULT_ADAPTERS: WizardAdapters = {
  csvParser: new CSVParserAdapter(),
  taskStorage: new TaskStorageAdapter(),
  sqlGenerator: new SQLGeneratorAdapter()
};

export function useWizard({ initialConfig = {}, adapters = DEFAULT_ADAPTERS }: WizardOptions = {}) {
  const { csvParser, taskStorage, sqlGenerator } = adapters;

  // Wizard state
  const [step, setStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Data state
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<ParsedData | null>(null);
  const [columnIndices, setColumnIndices] = useState<CSVIndices | null>(null);
  const [tasks, setTasks] = useState<UniqueTask[]>([]);
  const [taskMapping, setTaskMapping] = useState<Record<string, string>>({});
  const [, setSuggestedTasks] = useState<Record<string, boolean>>({});
  const [config, setConfig] = useState<WizardConfig>({ 
    ...DEFAULT_CONFIG, 
    ...(initialConfig as any) // Typecast for loose mapping from partial
  });
  const [sqlResult, setSqlResult] = useState<SQLResult | null>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  // Computed summaries
  const totalRows = useMemo(() => csvData?.rows?.length || 0, [csvData]);
  const uniqueTasks = useMemo(() => tasks.length, [tasks]);
  const mappedTasks = useMemo(() => 
    Object.values(taskMapping).filter(id => id && /^[1-9]\d*$/.test(id)).length, 
    [taskMapping]
  );
  const progress = useMemo(() => 
    uniqueTasks > 0 ? Math.round((mappedTasks / uniqueTasks) * 100) : 0,
    [uniqueTasks, mappedTasks]
  );
  const isFullyMapped = useMemo(() => 
    uniqueTasks > 0 && mappedTasks === uniqueTasks,
    [uniqueTasks, mappedTasks]
  );

  // 1. uploadFile action
  const uploadFile = useCallback(async (uploadedFile: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!uploadedFile.name.endsWith('.csv') && !uploadedFile.name.endsWith('.txt')) {
        throw new Error('El archivo debe ser CSV (.csv o .txt)');
      }

      const data = await csvParser.parse(uploadedFile, config.encoding);
      const indices = findColumnIndices(data.headers);
      const missingColumns = validateRequiredColumns(indices);
      
      if (missingColumns) {
        throw new Error(`Columnas requeridas no encontradas: ${missingColumns.join(', ')}`);
      }

      const uniqueTasksList = extractUniqueTasks(data.rows, indices);

      // Initialize task mapping with suggestions
      const initialMapping: Record<string, string> = {};
      const suggested: Record<string, boolean> = {};
      uniqueTasksList.forEach(task => {
        const suggestedId = taskStorage.loadSuggestedMapping(task.name);
        initialMapping[task.name] = suggestedId || '';
        if (suggestedId) {
          suggested[task.name] = true;
        }
      });

      setFile(uploadedFile);
      setCsvData(data);
      setColumnIndices(indices);
      setTasks(uniqueTasksList);
      setTaskMapping(initialMapping);
      setSuggestedTasks(suggested);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [config.encoding, csvParser, taskStorage]);

  // 2. setTaskId action
  const setTaskId = useCallback((taskName: string, taskId: string) => {
    setTaskMapping(prev => ({
      ...prev,
      [taskName]: taskId
    }));
    
    // Persist if valid
    if (taskId && taskId.trim() !== '' && /^[1-9]\d*$/.test(taskId)) {
      taskStorage.saveMappings({ [taskName]: taskId });
      setSuggestedTasks(prev => ({
        ...prev,
        [taskName]: true
      }));
    }
  }, [taskStorage]);

  // Internal validation helper
  const validateTaskMapping = useCallback(() => {
    const errors: { task: string; error: string }[] = [];
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

  // 3. generateSQL action
  const generateSQLAction = useCallback(() => {
    if (!csvData || !columnIndices) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const validation = validateTaskMapping();
      if (!validation.isValid) {
        const errorMsg: string[] = [];
        if (validation.emptyCount > 0) {
          errorMsg.push(`${validation.emptyCount} tarea(s) sin ID asignado`);
        }
        if (validation.invalidCount > 0) {
          errorMsg.push(`${validation.invalidCount} ID(s) inválido(s)`);
        }
        throw new Error(errorMsg.join(', '));
      }

      const numericMapping: Record<string, string> = {};
      Object.entries(taskMapping).forEach(([task, id]) => {
        numericMapping[task] = id; // Changed from parseInt to string to match port
      });

      let rowsToProcess = csvData.rows;
      if (selectedRows.length > 0) {
        const selectedSet = new Set(selectedRows);
        rowsToProcess = csvData.rows.filter((_, index) => selectedSet.has(index));
      }

      const result = sqlGenerator.generate({
        rows: rowsToProcess,
        headers: csvData.headers,
        taskMapping: numericMapping,
        config,
        indices: columnIndices
      });

      setSqlResult(result);
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [csvData, taskMapping, config, columnIndices, validateTaskMapping, selectedRows, sqlGenerator]);

  // 4. goToStep action
  const goToStep = useCallback((targetStep: number | 'upload' | 'mapping' | 'preview') => {
    let stepNum: number;
    if (typeof targetStep === 'string') {
       stepNum = { upload: 1, mapping: 2, preview: 3 }[targetStep];
    } else {
       stepNum = targetStep;
    }

    if (stepNum === 1) {
      setStep(1);
      setCsvData(null);
      setTasks([]);
      setTaskMapping({});
      setSqlResult(null);
      setError(null);
      setSelectedRows([]);
    } else if (stepNum === 2 && csvData) {
      setStep(2);
      setSqlResult(null);
      setError(null);
    } else if (stepNum === 3 && sqlResult) {
      setStep(3);
      setError(null);
    }
  }, [csvData, sqlResult]);

  // 5. reset action
  const reset = useCallback(() => {
    setStep(1);
    setFile(null);
    setCsvData(null);
    setColumnIndices(null);
    setTasks([]);
    setTaskMapping({});
    setConfig((prev) => {
      const newConfig = { ...prev, ...initialConfig };
      return newConfig as WizardConfig;
    });
    setSqlResult(null);
    setError(null);
    setIsLoading(false);
    setSelectedRows([]);
  }, [initialConfig]);

  // Data accessors
  const getTasks = useCallback((): UniqueTask[] => {
    return tasks.map(task => ({
      name: task.name,
      fechaInicio: task.fechaInicio,
      fechaFin: task.fechaFin,
      totalMinutes: task.totalMinutes
    }));
  }, [tasks]);

  const getSqlResult = useCallback(() => {
    if (!sqlResult) return null;
    return {
      sql: sqlResult.sql,
      statements: sqlResult.statements,
      stats: {
        processed: sqlResult.processed,
        errors: sqlResult.errors.length
      }
    };
  }, [sqlResult]);

  return {
    // Status
    step,
    isLoading,
    error,
    
    // Actions
    uploadFile,
    setTaskId,
    generateSQL: generateSQLAction,
    goToStep,
    reset,

    // State exposing
    file,

    // Computed
    totalRows,
    uniqueTasks,
    mappedTasks,
    progress,
    isFullyMapped,

    // Accessors
    getTasks,
    getSqlResult,

    // Escape hatch
    _raw: {
      csvData,
      taskMapping,
      config,
      selectedRows,
      setSelectedRows,
      file,
      columnIndices,
      sqlResult,
      updateConfig: (key: string, value: string) => setConfig(prev => ({ ...prev, [key]: value })),
      setError
    }
  };
}
