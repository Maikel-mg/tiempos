## Why

Currently, when importing times in step 2 of the import flow, users must generate the SQL file first to see which records will be processed. This makes it difficult to determine which process IDs should be included or excluded before committing to the import. Users need a way to preview and filter CSV data beforehand to make informed decisions about what data to import.

## What Changes

- Add a "Preview" button in step 2 of the import wizard that opens a modal/dialog with the loaded CSV data
- Display CSV data in a tabular format with sortable columns
- Add filtering capabilities to search/filter rows by any column value
- Show summary statistics (total rows, filtered rows count)
- Allow users to select/deselect specific process IDs for inclusion
- Integrate preview functionality with existing CSV parsing logic

## Capabilities

### New Capabilities
- `csv-preview`: Preview and filter CSV data before SQL generation, enabling users to view all records, filter by process IDs or other fields, and select which processes to include in the import

### Modified Capabilities
- (none)

## Impact

- Step 2 of the import wizard (file selection and parsing)
- CSV parsing utilities (reused for preview)
- No new API endpoints required
- No database schema changes
