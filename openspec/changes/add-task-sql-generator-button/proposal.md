## Why

Users currently have to manually create SQL scripts for task creation. Adding a button to generate this SQL based on task data will streamline the workflow and reduce manual entry errors.

## What Changes

- Add a "Generate SQL" button in the task row UI, adjacent to the task ID input.
- Implement logic to generate a SQL script using task parameters:
  - `@pNombre`: Task name.
  - `@pFechaIniPrevista`: Start date (YYYYMMDD).
  - `@pFechaFinPrevista`: End date (YYYYMMDD).
  - `@pTiempoPrevisto`: Estimated time in minutes.
  - `@pTecnicoPrev`: Assigned technician time in minutes.
  - `@pFase`: Phase parameter from user input.
  - `@pFechaEstimacion`: First day of the month from the file data.
- The button should allow the user to easily copy the generated SQL.

## Capabilities

### New Capabilities
- `sql-generation`: Logic and UI for generating task creation SQL scripts from task row data.

### Modified Capabilities
<!-- No requirement changes to existing capabilities -->

## Impact

- Task row component (UI)
- SQL generation utility logic
