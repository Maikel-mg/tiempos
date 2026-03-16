## Why

Currently, the application only allows generating and executing SQL statements via a manual CSV import process. Users need to be able to perform these same operations (generation, preview, and execution) directly from the "Live Time Entries" view, which fetches data from the Clockify API. This eliminates the need for manual CSV exports/imports and streamlines the workflow for synchronizing live data with the target database.

## What Changes

- **Row Selection**: Implement a selection mechanism (checkboxes) in the `LiveTimeEntriesPage` table to choose specific entries for processing.
- **SQL Generation Actions**: Add buttons to "Generate SQL", "Download SQL", and "Execute in DB" for the selected live entries.
- **SQL Preview**: Integrate a preview section in `LiveTimeEntriesPage` similar to `Step3Preview.jsx`.
- **Generator Refactoring**: Update `sql-generator.js` to be agnostic of the data source (CSV array vs. API object).

## Capabilities

### New Capabilities
- `live-data-sql-export`: Provides SQL generation, preview, and execution functionality within the Live Time Entries view.

### Modified Capabilities
- `sql-generation`: Updated to support structured objects from the API in addition to the indexed rows from CSV imports.

## Impact

- `LiveTimeEntriesPage.jsx`: Major UI and logic updates for selection and actions.
- `sql-generator.js`: Logic refactor for data source abstraction.
- `Step3Preview.jsx`: May benefit from the refactored generator.
- Backend API: `api/execute-sql` will be called from a new location.
