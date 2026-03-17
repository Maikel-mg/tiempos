## Why

SQL generation logic is scattered across multiple files (`sql-generator.js`, `generar-sql.js`, and React components), causing:
- Duplicated code between Node.js CLI and browser
- Hard to test - no clear boundaries
- When stored procedure parameters change, updates needed in 5+ files
- Understanding the flow requires bouncing between many files

## What Changes

1. **Create unified SQL generation module** with 3 entry points:
   - `generateTimeEntrySQL()` - for CSV/array data
   - `generateFromSource()` - for external sources (Clockify)
   - `generateTaskSQL()` - for task/process creation

2. **Centralize stored procedure parameter registry** - single source of truth for all SP parameters

3. **Consolidate duplicated logic** - eliminate code duplication between browser and Node.js

4. **Enable boundary testing** - test at the 3-function interface instead of scattered utilities

## Capabilities

### New Capabilities

- `sql-generator-api`: Unified public API for SQL generation with 3 entry points
- `sp-parameter-registry`: Centralized stored procedure parameter definitions
- `unified-date-duration-parsing`: Shared date/time/duration parsing for browser and Node.js

### Modified Capabilities

- None - this is a refactoring without spec-level behavior changes

## Impact

- **Code**: Consolidate `sql-generator.js`, `generar-sql.js` into single module
- **API**: New 3-function interface replaces scattered function calls
- **Testing**: Enable boundary tests for SQL generation
- **Dependencies**: No new external dependencies (pure JS, works in browser and Node.js)
