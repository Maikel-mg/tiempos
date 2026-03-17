## 1. Create Ports Layer

- [x] 1.1 Create `web-ui/src/hooks/wizard/ports.js` with CSVParserPort interface
- [x] 1.2 Create TaskStoragePort interface in ports.js
- [x] 1.3 Create SQLGeneratorPort interface in ports.js

## 2. Create Default Adapters

- [x] 2.1 Create `web-ui/src/hooks/wizard/adapters.js` with CSVParserAdapter
- [x] 2.2 Implement LocalStorageAdapter for task mappings
- [x] 2.3 Implement SQLGeneratorAdapter using existing sql-generator module

## 3. Create New useWizard Hook

- [x] 3.1 Implement useWizard with 5 core actions (uploadFile, setTaskId, generateSQL, goToStep, reset)
- [x] 3.2 Implement computed summaries (totalRows, uniqueTasks, mappedTasks, progress, isFullyMapped)
- [x] 3.3 Implement data accessors (getTasks, getSqlResult)
- [x] 3.4 Add _raw escape hatch for edge cases
- [x] 3.5 Inject adapters via parameters with defaults

## 4. Add Backward Compatibility Wrapper

- [x] 4.1 Export legacy useWizard as useWizardLegacy
- [x] 4.2 Create wrapper that provides both old and new interfaces
- [x] 4.3 Add deprecation console warning for legacy interface

## 5. Update Components

- [x] 5.1 Update ImportCsvPage.jsx to use new simplified API
- [x] 5.2 Verify Step1Upload works with uploadFile action
- [x] 5.3 Verify Step2Tasks works with getTasks and setTaskId
- [x] 5.4 Verify Step3Preview works with getSqlResult

## 6. Add Tests

- [x] 6.1 Create `web-ui/src/hooks/__tests__/wizard-actions.test.js`
- [x] 6.2 Create `web-ui/src/hooks/__tests__/wizard-summaries.test.js`
- [x] 6.3 Create `web-ui/src/hooks/__tests__/wizard-accessors.test.js`
- [x] 6.4 Add adapter tests with mocked dependencies

## 7. Cleanup

- [x] 7.1 Remove wrapper after full migration
- [x] 7.2 Verify all existing functionality works
- [x] 7.3 Document new API in code comments