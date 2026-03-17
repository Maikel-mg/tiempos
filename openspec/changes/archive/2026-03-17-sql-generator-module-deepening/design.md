## Context

**Current State:**
- SQL generation logic split between `web-ui/src/lib/sql-generator.js` (browser) and `generar-sql.js` (Node.js)
- Additional SQL logic scattered in React components (`Step2Tasks.jsx`, `Step3Preview.jsx`, `LiveTimeEntriesPage.jsx`)
- ~40 stored procedure parameters hardcoded across files
- No tests - scattered logic is hard to test

**Constraints:**
- Must work in both browser and Node.js environments
- Must maintain backward compatibility with existing callers
- SQL Server stored procedures cannot change (external dependency)

## Goals / Non-Goals

**Goals:**
- Create unified 3-entry-point API for SQL generation
- Centralize stored procedure parameter definitions
- Eliminate code duplication between browser and Node.js
- Enable boundary testing at the module interface

**Non-Goals:**
- Change stored procedure signatures (external dependency)
- Add new data sources (only support existing: CSV, Clockify)
- Add runtime configuration UI (config stays in components)

## Decisions

### 1. Three Entry Points (not flexible class)
**Decision**: Expose only 3 functions instead of a flexible class-based API
**Rationale**: Matches actual caller patterns, simpler to learn, easier to test
**Alternative considered**: Class-based API with configure(), generate() - too flexible for this use case

### 2. Internal SP Registry (not exposed)
**Decision**: Store procedure parameters in internal registry, not exposed to callers
**Rationale**: Keeps API simple while enabling single-point maintenance
**Alternative considered**: Let callers configure SP params - too error-prone

### 3. Dual Export (UMD)
**Decision**: Export as both ESM (browser) and CJS (Node.js)
**Rationalie**: Required for CLI tool to use same module
**Alternative considered**: Separate browser/Node modules - would duplicate code

## Risks / Trade-offs

- **[Risk] Breaking existing callers** → Mitigation: Export aliases for old function names during transition
- **[Risk] Missing edge cases from scattered logic** → Mitigation: Thoroughly review all existing callers before consolidating
- **[Risk] Testing requires refactoring components** → Mitigation: Add integration tests first, refactor components later
