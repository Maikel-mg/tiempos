import { useState, useCallback, useMemo } from 'react';
import { findColumnIndices, validateRequiredColumns, extractUniqueTasks } from '@/lib/csv-parser';
import { CSVParserAdapter, TaskStorageAdapter, SQLGeneratorAdapter } from './adapters';

const DEFAULT_CONFIG = {
  usuario: '',
  fase: '',
  tipoHora: '11',
  encoding: 'utf8'
};

const DEFAULT_ADAPTERS = {
  csvParser: new CSVParserAdapter(),
  taskStorage: new TaskStorageAdapter(),
  sqlGenerator: new SQLGeneratorAdapter()
};

/**
 * Deepened useWizard hook
 * @param {Object} options
 * @param {Object} options.initialConfig
 * @param {Object} options.adapters
 */
export function useWizard({ initialConfig = {}, adapters = DEFAULT_ADAPTERS } = {}) {
  const { csvParser, taskStorage, sqlGenerator } = adapters;

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
  const [suggestedTasks, setSuggestedTasks] = useState({});
  const [config, setConfig] = useState({ ...DEFAULT_CONFIG, ...initialConfig });
  const [sqlResult, setSqlResult] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);

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
  const uploadFile = useCallback(async (uploadedFile) => {
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
      const initialMapping = {};
      const suggested = {};
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
    } catch (err) {
      setError(err.message);
      // Ensure loading is false on error
    } finally {
      setIsLoading(false);
    }
  }, [config.encoding, csvParser, taskStorage]);

  // 2. setTaskId action
  const setTaskId = useCallback((taskName, taskId) => {
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

  // 3. generateSQL action
  const generateSQLAction = useCallback(() => {
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

      const numericMapping = {};
      Object.entries(taskMapping).forEach(([task, id]) => {
        numericMapping[task] = parseInt(id);
      });

      let rowsToProcess = csvData.rows;
      if (selectedRows.length > 0) {
        const selectedSet = new Set(selectedRows.map(Number));
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
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [csvData, taskMapping, config, columnIndices, validateTaskMapping, selectedRows, sqlGenerator]);

  // 4. goToStep action
  const goToStep = useCallback((targetStep) => {
    const stepNum = typeof targetStep === 'string' 
      ? { upload: 1, mapping: 2, preview: 3 }[targetStep] 
      : targetStep;

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
    setConfig({ ...DEFAULT_CONFIG, ...initialConfig });
    setSqlResult(null);
    setError(null);
    setIsLoading(false);
    setSelectedRows([]);
  }, [initialConfig]);

  // Data accessors
  const getTasks = useCallback(() => {
    return tasks.map(task => ({
      name: task.name,
      assignedId: taskMapping[task.name] || null,
      isSuggested: suggestedTasks[task.name] || false,
      summary: {
        startDate: task.fechaInicio,
        endDate: task.fechaFin,
        totalMinutes: task.totalMinutes
      }
    }));
  }, [tasks, taskMapping, suggestedTasks]);

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
      updateConfig: (key, value) => setConfig(prev => ({ ...prev, [key]: value })),
      setError
    }
  };
}
