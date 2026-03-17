## Context

**Current State:**
- `useWizard.js` has 258 lines with 11+ state variables
- Exposes raw internal state: `csvData`, `columnIndices`, `taskMapping`, `suggestedTasks`
- Exposes internal functions: `validateTaskMapping()`, `handleFileUpload`, `updateTaskId`
- No dependency injection - tight coupling to csv-parser, sql-generator, task-mapping-storage

**Constraints:**
- Must work with React 18 and existing component patterns
- Must persist task mappings to localStorage
- Must integrate with existing step components (Step1Upload, Step2Tasks, Step3Preview)
- No external state management library

## Goals / Non-Goals

**Goals:**
- Reduce API surface from ~25 items to ~12 items
- Hide internal state (columnIndices, suggestedTasks)
- Provide computed summaries (progress, isFullyMapped)
- Enable dependency injection for testability
- Maintain backward compatibility during migration

**Non-Goals:**
- Add UI components (keep it headless)
- Add undo/redo functionality
- Support real-time collaboration
- Replace localStorage with backend storage

## Decisions

### 1. 5-Action API (not minimal 3, not flexible 20+)
**Decision**: Expose 5 actions that cover 95% of use cases
- `uploadFile` - Parse CSV + extract tasks + auto-map from storage
- `setTaskId` - Update mapping + persist to storage
- `generateSQL` - Validate all + build mapping + generate SQL
- `goToStep` - Navigate with validation
- `reset` - Reset to initial state

**Rationale**: Matches actual caller patterns, simple to learn, easy to test
**Alternative considered**: 3 actions (too coarse for edge cases), 20+ methods (too complex)

### 2. Computed Summaries Instead of Raw State
**Decision**: Expose `progress`, `isFullyMapped` instead of `columnIndices`, `suggestedTasks`

**Rationale**: Callers don't need internal structure, computed values are safer
**Alternative considered**: Expose raw state (breaks encapsulation, causes bugs)

### 3. Data Accessors (Lazy, Not Real-Time)
**Decision**: `getTasks()`, `getSqlResult()` return data, not reactive state

**Rationale**: Hides internal structure (tasks is array, not derived from taskMapping)
**Alternative considered**: Reactive state (would re-expose internal coupling)

### 4. Ports & Adapters for Testability
**Decision**: Inject csvParser, taskStorage, sqlGenerator via parameters

**Rationale**: Enables mocking in tests without touching production code
**Alternative considered**: Hard-coded imports (impossible to test in isolation)

### 5. Escape Hatch for Edge Cases
**Decision**: Expose `_raw` property with full state for advanced cases

**Rationale**: 95% use simplified API, 5% need full control
**Alternative considered**: No escape hatch (blocks power users)

## Risks / Trade-offs

- **[Risk] Breaking existing callers** → Mitigation: Export both APIs, deprecate old one
- **[Risk] Migration complexity** → Mitigation: Wrapper function for backward compat
- **[Risk] Data accessor performance** → Mitigation: Memoize results, lazy is acceptable

## Migration Plan

1. Create new `useWizard` with optimized API alongside old one
2. Update `ImportCsvPage.jsx` to use new API
3. Run tests to verify functionality
4. Deprecate old hook with console warning
5. Remove old hook in next major version

## Open Questions

- Should the escape hatch be `_raw` or `unboxed`?
- Should data accessors be reactive (useState) or lazy (functions)?