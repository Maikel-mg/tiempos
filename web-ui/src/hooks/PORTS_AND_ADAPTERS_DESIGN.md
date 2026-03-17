# Ports & Adapters Architecture for useWizard Refactor

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                                 │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    useWizard (React Hook)                        │    │
│  │  - Orchestrates workflow                                       │    │
│  │  - Manages UI state                                            │    │
│  │  - Delegates to ports                                          │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      DOMAIN SERVICES                             │    │
│  │  (Pure JS logic, no framework dependencies)                     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ depends on
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           PORT LAYER                                     │
│  Interfaces defining contracts for external dependencies                │
│                                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │ FilePort     │ │ CSVParserPort│ │ StoragePort  │ │ SQLGenPort   │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ implements
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         ADAPTER LAYER                                    │
│  External implementations (pluggable)                                   │
│                                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │BrowserFile   │ │ NodeCSV      │ │LocalStorage  │ │ TemplateSQL  │   │
│  │Adapter       │ │ Adapter      │ │ Adapter      │ │ Adapter      │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Port Interfaces

### 2.1 FilePort

```typescript
/**
 * @name FilePort
 * @description Handles file input/output operations
 * @location web-ui/src/ports/FilePort.js
 */

export class FilePort {
  /**
   * Validates file type and returns boolean
   * @param {File} file
   * @returns {boolean}
   */
  isValidType(file) {}

  /**
   * Reads file content as text
   * @param {File} file
   * @param {string} encoding
   * @returns {Promise<string>}
   */
  readAsText(file, encoding) {}

  /**
   * Gets file metadata
   * @param {File} file
   * @returns {{name: string, size: number, type: string}}
   */
  getMetadata(file) {}
}
```

### 2.2 CSVParserPort

```typescript
/**
 * @name CSVParserPort
 * @description Parses CSV content and extracts structured data
 * @location web-ui/src/ports/CSVParserPort.js
 */

export class CSVParserPort {
  /**
   * Parses CSV content into structured data
   * @param {string} content
   * @param {object} options
   * @returns {Promise<{headers: string[], rows: any[]}>}
   */
  parse(content, options) {}

  /**
   * Finds column indices for known columns
   * @param {string[]} headers
   * @returns {object} - Mapping of column names to indices
   */
  findColumnIndices(headers) {}

  /**
   * Validates required columns exist
   * @param {object} indices
   * @returns {string[]|null} - Missing columns or null if valid
   */
  validateRequiredColumns(indices) {}

  /**
   * Extracts unique tasks from rows
   * @param {any[]} rows
   * @param {object} indices
   * @returns {{name: string, rowIndex: number}[]}
   */
  extractUniqueTasks(rows, indices) {}
}
```

### 2.3 TaskMappingStoragePort

```typescript
/**
 * @name TaskMappingStoragePort
 * @description Persists and retrieves task-ID mappings
 * @location web-ui/src/ports/TaskMappingStoragePort.js
 */

export class TaskMappingStoragePort {
  /**
   * Saves a mapping to persistent storage
   * @param {object} mapping - { taskName: taskId }
   * @returns {Promise<void>}
   */
  save(mapping) {}

  /**
   * Loads all stored mappings
   * @returns {Promise<object>}
   */
  loadAll() {}

  /**
   * Finds suggested mapping for a task name
   * @param {string} taskName
   * @returns {string|null}
   */
  findByTaskName(taskName) {}

  /**
   * Removes a mapping by task name
   * @param {string} taskName
   * @returns {Promise<void>}
   */
  remove(taskName) {}

  /**
   * Clears all stored mappings
   * @returns {Promise<void>}
   */
  clear() {}
}
```

### 2.4 SQLGeneratorPort

```typescript
/**
 * @name SQLGeneratorPort
 * @description Generates SQL INSERT statements from mapped data
 * @location web-ui/src/ports/SQLGeneratorPort.js
 */

export class SQLGeneratorPort {
  /**
   * Generates SQL INSERT statements
   * @param {object} params
   * @param {any[]} params.rows - CSV rows to process
   * @param {string[]} params.headers - CSV headers
   * @param {object} params.taskMapping - { taskName: taskId }
   * @param {object} params.config - User configuration
   * @param {object} params.indices - Column indices
   * @returns {string}
   */
  generate({ rows, headers, taskMapping, config, indices }) {}

  /**
   * Validates configuration before generation
   * @param {object} config
   * @returns {{valid: boolean, errors: string[]}}
   */
  validateConfig(config) {}
}
```

---

## 3. Adapter Implementations

### 3.1 BrowserFileAdapter

```javascript
/**
 * @name BrowserFileAdapter
 * @description Browser-native file handling adapter
 * @location web-ui/src/adapters/BrowserFileAdapter.js
 */

export class BrowserFileAdapter {
  constructor() {
    this.allowedExtensions = ['.csv', '.txt'];
  }

  isValidType(file) {
    const fileName = file.name?.toLowerCase() || '';
    return this.allowedExtensions.some(ext => fileName.endsWith(ext));
  }

  async readAsText(file, encoding = 'utf8') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read file'));
      reader.readAsText(file, encoding);
    });
  }

  getMetadata(file) {
    return {
      name: file.name,
      size: file.size,
      type: file.type
    };
  }
}
```

### 3.2 LocalStorageTaskMappingAdapter

```javascript
/**
 * @name LocalStorageTaskMappingAdapter
 * @description localStorage/sessionStorage implementation
 * @location web-ui/src/adapters/LocalStorageTaskMappingAdapter.js
 */

const STORAGE_KEY = 'wizard_persistent_mappings';

export class LocalStorageTaskMappingAdapter {
  constructor(options = {}) {
    this.sessionStorage = options.sessionStorage || window.sessionStorage;
    this.localStorage = options.localStorage || window.localStorage;
  }

  async save(mapping) {
    try {
      const existing = await this.loadAll();
      const updated = { ...existing, ...mapping };
      this.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save mapping:', e);
    }
  }

  async loadAll() {
    try {
      const stored = this.localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.warn('Failed to load mappings:', e);
      return {};
    }
  }

  async findByTaskName(taskName) {
    const all = await this.loadAll();
    return all[taskName] || null;
  }

  async remove(taskName) {
    const all = await this.loadAll();
    delete all[taskName];
    this.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  async clear() {
    this.localStorage.removeItem(STORAGE_KEY);
  }
}
```

### 3.3 CSVParserAdapter (delegates to existing csv-parser)

```javascript
/**
 * @name CSVParserAdapter
 * @description Wraps existing csv-parser utilities
 * @location web-ui/src/adapters/CSVParserAdapter.js
 */

import { parseCSV, findColumnIndices, validateRequiredColumns, extractUniqueTasks } from '@/lib/csv-parser';

export class CSVParserAdapter {
  async parse(content, options = {}) {
    return parseCSV(content, options.encoding);
  }

  findColumnIndices(headers) {
    return findColumnIndices(headers);
  }

  validateRequiredColumns(indices) {
    return validateRequiredColumns(indices);
  }

  extractUniqueTasks(rows, indices) {
    return extractUniqueTasks(rows, indices);
  }
}
```

### 3.4 SQLGeneratorAdapter (delegates to existing sql-generator)

```javascript
/**
 * @name SQLGeneratorAdapter
 * @description Wraps existing sql-generator
 * @location web-ui/src/adapters/SQLGeneratorAdapter.js
 */

import { generateSQL } from '@/lib/sql-generator';

export class SQLGeneratorAdapter {
  generate({ rows, headers, taskMapping, config, indices }) {
    return generateSQL({ rows, headers, taskMapping, config, indices });
  }

  validateConfig(config) {
    const errors = [];
    if (!config.usuario) errors.push('Usuario requerido');
    if (!config.fase) errors.push('Fase requerida');
    return { valid: errors.length === 0, errors };
  }
}
```

---

## 4. Refactored useWizard Implementation

```javascript
/**
 * @name useWizard
 * @refactored Refactored using ports & adapters pattern
 * @location web-ui/src/hooks/useWizard.js
 */

import { useState, useCallback, useEffect } from 'react';
import { FilePort } from '@/ports/FilePort';
import { CSVParserPort } from '@/ports/CSVParserPort';
import { TaskMappingStoragePort } from '@/ports/TaskMappingStoragePort';
import { SQLGeneratorPort } from '@/ports/SQLGeneratorPort';
import { BrowserFileAdapter } from '@/adapters/BrowserFileAdapter';
import { CSVParserAdapter } from '@/adapters/CSVParserAdapter';
import { LocalStorageTaskMappingAdapter } from '@/adapters/LocalStorageTaskMappingAdapter';
import { SQLGeneratorAdapter } from '@/adapters/SQLGeneratorAdapter';

const DEFAULT_CONFIG = {
  usuario: '',
  fase: '',
  tipoHora: '11',
  encoding: 'utf8'
};

export function useWizard(dependencies = {}) {
  // Inject adapters (with defaults)
  const fileAdapter = dependencies.fileAdapter || new BrowserFileAdapter();
  const csvParser = dependencies.csvParser || new CSVParserAdapter();
  const storage = dependencies.storage || new LocalStorageTaskMappingAdapter();
  const sqlGenerator = dependencies.sqlGenerator || new SQLGeneratorAdapter();

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
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [sqlResult, setSqlResult] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);

  // File upload handler
  const handleFileUpload = useCallback(async (uploadedFile) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!fileAdapter.isValidType(uploadedFile)) {
        throw new Error('El archivo debe ser CSV (.csv o .txt)');
      }

      const content = await fileAdapter.readAsText(uploadedFile, config.encoding);
      const data = await csvParser.parse(content, { encoding: config.encoding });
      const indices = csvParser.findColumnIndices(data.headers);
      const missingColumns = csvParser.validateRequiredColumns(indices);

      if (missingColumns) {
        throw new Error(`Columnas requeridas no encontradas: ${missingColumns.join(', ')}`);
      }

      const uniqueTasks = csvParser.extractUniqueTasks(data.rows, indices);

      // Initialize with persisted mappings
      const initialMapping = {};
      const suggested = {};
      for (const task of uniqueTasks) {
        const suggestedId = await storage.findByTaskName(task.name);
        initialMapping[task.name] = suggestedId || '';
        if (suggestedId) suggested[task.name] = true;
      }

      setFile(uploadedFile);
      setCsvData(data);
      setColumnIndices(indices);
      setTasks(uniqueTasks);
      setTaskMapping(initialMapping);
      setSuggestedTasks(suggested);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [fileAdapter, csvParser, storage, config.encoding]);

  // Task mapping handlers
  const updateTaskId = useCallback(async (taskName, taskId) => {
    setTaskMapping(prev => ({ ...prev, [taskName]: taskId }));

    if (taskId && /^[1-9]\d*$/.test(taskId)) {
      await storage.save({ [taskName]: taskId });
      setSuggestedTasks(prev => ({ ...prev, [taskName]: true }));
    }
  }, [storage]);

  const validateTaskMapping = useCallback(() => {
    const errors = [];
    let emptyCount = 0;
    let invalidCount = 0;

    Object.entries(taskMapping).forEach(([task, id]) => {
      if (!id) {
        emptyCount++;
      } else if (!/^[1-9]\d*$/.test(id)) {
        invalidCount++;
        errors.push({
          task: task.length > 40 ? task.substring(0, 40) + '...' : task,
          error: 'El ID debe ser un número entero positivo'
        });
      }
    });

    return { isValid: emptyCount === 0 && invalidCount === 0, emptyCount, invalidCount, errors };
  }, [taskMapping]);

  // Generate SQL
  const handleGenerateSQL = useCallback(() => {
    setIsLoading(true);
    setError(null);

    try {
      const validation = validateTaskMapping();
      if (!validation.isValid) {
        const errorMsg = [];
        if (validation.emptyCount > 0) errorMsg.push(`${validation.emptyCount} tarea(s) sin ID asignado`);
        if (validation.invalidCount > 0) errorMsg.push(`${validation.invalidCount} ID(s) inválido(s)`);
        throw new Error(errorMsg.join(', '));
      }

      const numericMapping = Object.fromEntries(
        Object.entries(taskMapping).map(([task, id]) => [task, parseInt(id)])
      );

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

  // Navigation
  const goToStep = useCallback((targetStep) => {
    if (targetStep === 1) {
      setStep(1);
      setCsvData(null);
      setTasks([]);
      setTaskMapping({});
      setSqlResult(null);
      setError(null);
      setSelectedRows([]);
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
    setConfig(prev => ({ ...prev, [key]: value }));
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
    setSelectedRows([]);
  }, []);

  return {
    step, isLoading, error, file, csvData, columnIndices, tasks, taskMapping,
    suggestedTasks, config, sqlResult, selectedRows,
    totalRows: csvData?.rows?.length || 0,
    uniqueTaskCount: tasks.length,
    mappedTaskCount: Object.values(taskMapping).filter(id => id && /^[1-9]\d*$/.test(id)).length,
    handleFileUpload, updateTaskId, validateTaskMapping, handleGenerateSQL,
    goToStep, updateConfig, resetWizard, setError, setSelectedRows
  };
}
```

---

## 5. Layer Responsibilities Matrix

| Layer | What It Hides | What It Exposes | Example |
|-------|---------------|-----------------|---------|
| **Application** | UI framework (React), state management logic | Workflow orchestration, computed values | `handleFileUpload` orchestrates file validation → parsing → storage |
| **Ports** | Concrete implementation details | Abstract interfaces (contracts) | `FilePort.isValidType()` hides "browser File API" |
| **Adapters** | Business logic, external service APIs | Concrete implementations of ports | `BrowserFileAdapter` uses `FileReader` API |
| **External** | - | Browser APIs, localStorage, File API | `window.sessionStorage`, `FileReader` |

---

## 6. Dependency Strategy

```
                    ┌─────────────────┐
                    │   useWizard     │ ◄──┐
                    │   (application) │   │
                    └────────┬────────┘   │
                             │            │
                    ┌────────▼────────┐   │ (dependency injection)
                    │     Ports        │   │
                    └────────┬────────┘   │
                             │            │
              ┌──────────────┼────────────┤
              │              │            │
     ┌────────▼─────┐ ┌──────▼──────┐ ┌──▼──────────┐
     │ BrowserFile  │ │ CSVParser   │ │LocalStorage │
     │ Adapter      │ │ Adapter     │ │ Adapter     │
     └──────────────┘ └─────────────┘ └─────────────┘
              │              │            │
     ┌────────▼─────┐        │      ┌────▼─────┐
     │FileReader API│        │      │local     │
     │(Browser)     │        │      │Storage   │
     └──────────────┘        │      └──────────┘
                             │
                    ┌────────▼────────┐
                    │ csv-parser lib  │
                    │ (node/csv-parse)│
                    └─────────────────┘
```

**Key Principles:**

1. **Dependency Inversion**: High-level modules (application) depend on abstractions (ports), not concretions
2. **DI via Constructor**: Adapters injected through parameters (enables testing)
3. **Adapter Location**: Adapters in `/adapters/`, ports in `/ports/`
4. **No Direct External Imports**: Application layer imports only ports, never external libs directly

---

## 7. Testing Strategy

```javascript
/**
 * @example Unit test with mock adapters
 */

import { useWizard } from './useWizard';
import { MockFileAdapter } from '@/adapters/MockFileAdapter';
import { MockCSVParserAdapter } from '@/adapters/MockCSVParserAdapter';
import { MockStorageAdapter } from '@/adapters/MockStorageAdapter';

test('uploads CSV and loads persisted mappings', async () => {
  const mockStorage = new MockStorageAdapter({
    'Tarea 1': '123'
  });

  const { handleFileUpload, tasks, taskMapping } = useWizard({
    fileAdapter: new MockFileAdapter(),
    csvParser: new MockCSVParserAdapter(),
    storage: mockStorage,
    sqlGenerator: new MockSQLGeneratorAdapter()
  });

  await handleFileUpload(mockCSVFile);

  expect(tasks).toHaveLength(3);
  expect(taskMapping['Tarea 1']).toBe('123'); // From storage
});
```

---

## 8. Trade-offs Analysis

### Advantages

| Benefit | Description |
|---------|-------------|
| **Testability** | Mock adapters enable unit tests without file I/O or localStorage |
| **Swapability** | Replace `localStorage` with IndexedDB without changing application code |
| **Single Responsibility** | Each port has one purpose; changes isolated to adapters |
| **Explicit Dependencies** | All external deps visible via constructor parameters |
| **Future-Proofing** | Easy to add new adapters (e.g., `RemoteStorageAdapter`, `NodeFileAdapter`) |

### Disadvantages

| Cost | Description |
|------|-------------|
| **Indirection Overhead** | Extra layer adds complexity for simple operations |
| **More Files** | ~8 new files vs single 258-line file |
| **Boilerplate** | Interface definitions add verbosity |
| **Learning Curve** | Team must understand ports & adapters pattern |

### When to Use This Pattern

| Use Case | Recommendation |
|----------|----------------|
| Simple CRUD operations | ⚠️ Overkill - use direct dependencies |
| Business logic with multiple external integrations | ✓ Recommended |
| Need for extensive testing | ✓ Recommended |
| Long-lived, evolving codebase | ✓ Recommended |
| One-off script or prototype | ⚠️ Not recommended |

---

## 9. File Structure After Refactor

```
web-ui/src/
├── hooks/
│   ├── useWizard.js           # Refactored (180 lines)
│   └── useWizard.test.js      # Tests
├── ports/
│   ├── FilePort.js
│   ├── CSVParserPort.js
│   ├── TaskMappingStoragePort.js
│   └── SQLGeneratorPort.js
├── adapters/
│   ├── BrowserFileAdapter.js
│   ├── LocalStorageTaskMappingAdapter.js
│   ├── CSVParserAdapter.js
│   ├── SQLGeneratorAdapter.js
│   └── mocks/
│       ├── MockFileAdapter.js
│       ├── MockCSVParserAdapter.js
│       ├── MockStorageAdapter.js
│       └── MockSQLGeneratorAdapter.js
└── lib/                        # Existing - unchanged
    ├── csv-parser.js
    ├── sql-generator.js
    └── task-mapping-storage.js
```

**Total Lines**: ~450 lines (ports + adapters + refactored hook + tests)
**Original**: 258 lines
**Net Change**: +192 lines, but +multiple test files and full testability