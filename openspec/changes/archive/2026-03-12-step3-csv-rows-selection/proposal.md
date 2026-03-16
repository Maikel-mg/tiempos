## Why

Currently, step 3 shows the complete generated SQL for all rows, but users cannot select which specific rows to import before generating the SQL. This makes it difficult to test or import data in batches. Users need to visually select specific CSV rows and see the resulting SQL before executing.

## What Changes

- Replace step 3's full SQL preview with a CSV rows table (identical to the preview modal from step 2)
- Add checkboxes to select/deselect specific rows to import
- Show SQL preview below the table (always visible) containing only the SQL for selected rows
- Add action buttons: Copy SQL, Download .sql, Execute in BD
- Maintain the existing stats display (processed, errors, total, error rate)

## Capabilities

### New Capabilities
- `csv-row-selection-step3`: Display CSV rows in step 3 with selection capability and dynamic SQL preview

### Modified Capabilities
- `sql-generation`: No requirement changes - just filtering which rows to include based on selection

## Impact

- `Step3Preview.jsx`: Major refactor to replace SQL-only view with CSV rows table + SQL preview
- `useWizard.js`: Update `handleGenerateSQL` to accept row selection filter
- `CSVPreviewModal.jsx`: Can be repurposed or referenced for the table structure in step 3
