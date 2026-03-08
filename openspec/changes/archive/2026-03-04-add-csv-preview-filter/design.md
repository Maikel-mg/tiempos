## Context

The import flow currently works in multiple steps. Step 2 handles file selection and CSV parsing. After loading the CSV, users immediately proceed to SQL generation without visibility into what data will be processed. This makes it difficult to:
- Verify the CSV was parsed correctly
- Identify which process IDs exist in the data
- Selectively include/exclude specific processes before import

The current implementation uses a stepper-based UI with separate pages for each import phase. The CSV parsing logic already exists and is used during SQL generation.

## Goals / Non-Goals

**Goals:**
- Add preview functionality to step 2 of the import wizard
- Display CSV data in a sortable, filterable table
- Show summary statistics (total rows, filtered count)
- Allow filtering by any column value
- Enable selection/deselection of specific process IDs

**Non-Goals:**
- Modifying the SQL generation logic itself
- Adding data validation (already handled elsewhere)
- Creating a reusable data table component for other parts of the app
- Export functionality (CSV export, etc.)

## Decisions

### 1. Modal vs. Inline Preview
**Decision:** Use a modal/dialog for the preview instead of inline expansion.

**Rationale:** 
- CSV files can contain thousands of rows; a modal provides a contained experience
- Better separation from the existing form layout in step 2
- Easier to implement responsive table with scrolling
- Modal pattern already exists in the codebase (antd Modal)

### 2. Table Library
**Decision:** Use existing table library from the codebase (likely antd Table or custom implementation).

**Rationale:**
- Avoid adding new dependencies
- Consistent look and feel with existing data displays
- Leverage existing pagination and sorting utilities

### 3. State Management
**Decision:** Keep preview state local to the step 2 component or use React Context if shared with parent.

**Rationale:**
- Preview is specific to step 2 workflow
- No need for global state
- Simpler to maintain and test

### 4. Filter Implementation
**Decision:** Implement column-based filtering with text search.

**Rationale:**
- Users need to filter by process ID and potentially other fields
- Simple text search is intuitive for most users
- Can extend to dropdown filters for specific columns if needed

## Risks / Trade-offs

- **Performance with large CSV files** → Implement client-side pagination in the preview table (show 100 rows per page)
- **Memory usage with large datasets** → Consider virtual scrolling if files exceed 10k rows
- **Filter state persistence** → Filter state will reset when modal is closed (acceptable trade-off for simplicity)
- **Partial process selection** → Selected IDs must be passed to SQL generation step; need to ensure this integration works correctly

## Open Questions

1. Should the preview remember which process IDs were selected when reopened?
2. Should we show column visibility toggles for the preview table?
3. Is there a maximum file size limit we should enforce before showing preview?
