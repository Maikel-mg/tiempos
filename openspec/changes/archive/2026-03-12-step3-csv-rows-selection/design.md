## Context

The current step 3 only shows the pre-generated SQL for all CSV rows. Users cannot:
- Select specific rows to import
- See which SQL corresponds to which row
- Test import with a subset of data

This change restructures step 3 to show the CSV rows table first, with SQL generation happening dynamically based on row selection.

## Goals / Non-Goals

**Goals:**
- Display CSV rows table in step 3 with checkboxes
- Generate SQL dynamically based on selected rows
- Show SQL preview below the table (always visible)
- Maintain existing action buttons: Copy, Download, Execute

**Non-Goals:**
- Modify step 2 (task ID assignment workflow)
- Change the SQL generation logic (spNETTiempos_Alta parameters)
- Add new database operations

## Decisions

### 1. SQL Preview Location
**Decision**: SQL preview always visible below the table (not tabs)

**Rationale**:
- More immediate feedback - user sees SQL change as they select
- Fewer clicks required
- Simpler UI pattern

### 2. Reuse vs New Component
**Decision**: Create new table component in Step3Preview, reference CSVPreviewModal logic

**Rationale**:
- Step 3 has different needs (always visible, different header actions)
- Avoid coupling between steps
- Easier to maintain independently

### 3. State Management
**Decision**: Use existing `selectedRows` state from useWizard, but filtered in step 3

**Rationale**:
- `selectedRows` already exists and tracks CSV row indices
- Step 2 uses it for "select all" functionality
- Step 3 will filter `csvData.rows` based on selection

### 4. SQL Generation Timing
**Decision**: Generate SQL on-the-fly when selection changes (debounced)

**Rationale**:
- Instant feedback for user
- Avoids pre-generating unused SQL
- Small dataset (typically <1000 rows) makes this performant

## Risks / Trade-offs

- **[Risk] Large dataset performance** → **Mitigation**: Add debounce (300ms) to SQL generation, consider virtualization if >5000 rows
- **[Risk] Breaking existing flow for users** → **Mitigation**: Default to all rows selected (same as current behavior), minimal UI change
- **[Risk] Re-generation on every selection** → **Mitigation**: Use memoization, only regenerate when selection changes

## Migration Plan

1. Update `useWizard.js`:
   - Add optional `selectedRows` parameter to `handleGenerateSQL`
   - Filter rows before generating SQL

2. Refactor `Step3Preview.jsx`:
   - Add CSV rows table with checkboxes
   - Add dynamic SQL preview panel
   - Keep stats and action buttons

3. Test:
   - Verify all selected → same SQL as current
   - Verify partial selection → correct subset of SQL
   - Verify actions (copy, download, execute) work with new flow
