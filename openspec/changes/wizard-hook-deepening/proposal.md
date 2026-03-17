## Why

The `useWizard` hook is a "God Hook" with 258 lines, 11+ state variables, and 10+ exposed actions. It handles file upload, CSV parsing, task mapping, SQL generation, and navigation - all tightly coupled in one place. This makes it:

- **Hard to test**: 11 state variables, complex dependencies
- **Hard to understand**: Callers need to know about internal state like `columnIndices` and `suggestedTasks`
- **Hard to maintain**: Changing one concern affects the entire hook
- **Bugs hide in seams**: Real bugs hide in how internal functions are called together

## What Changes

1. **Reduce API surface**: 10+ exposed items → 5 core actions
2. **Hide internal state**: `columnIndices`, `suggestedTasks`, `validateTaskMapping()` no longer exposed
3. **Add computed summaries**: `totalRows`, `uniqueTasks`, `mappedTasks`, `progress`, `isFullyMapped`
4. **Ports & adapters layer**: Inject csv-parser, task-storage, sql-generator for testability
5. **Backward compatibility**: Wrap old hook during migration

## Capabilities

### New Capabilities

- `wizard-actions`: Simplified 5-action API (uploadFile, setTaskId, generateSQL, goToStep, reset)
- `wizard-computed-summaries`: Derived state without exposing internal variables
- `wizard-data-accessors`: Lazy data accessors (getTasks(), getSqlResult()) hiding internal structure

### Modified Capabilities

- None - this is a refactoring without spec-level behavior changes

## Impact

- **Code**: Refactor `web-ui/src/hooks/useWizard.js` from 258 → ~120 lines
- **API**: Simplified from ~25 items to ~12 items
- **Components**: Update `ImportCsvPage.jsx` to use new interface
- **Testing**: Enable testing at 5-action boundary instead of 11 state variables