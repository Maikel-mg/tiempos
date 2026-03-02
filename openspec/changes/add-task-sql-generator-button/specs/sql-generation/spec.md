## ADDED Requirements

### Requirement: Task SQL Script Generation
The system SHALL provide a mechanism to generate a SQL script for task creation based on the task's properties.

#### Scenario: Generate SQL from task data
- **WHEN** the "Generate SQL" button is clicked for a specific task row
- **THEN** the system SHALL produce a SQL string with the following parameters:
  - `@pNombre`: Set to the task's name.
  - `@pFechaIniPrevista`: Set to the task's start date in YYYYMMDD format.
  - `@pFechaFinPrevista`: Set to the task's end date in YYYYMMDD format.
  - `@pTiempoPrevisto`: Set to the task's estimated time in minutes.
  - `@pTecnicoPrev`: Set to the technician's assigned time in minutes.
  - `@pFase`: Set to the phase parameter from the user's selection (Step 1).
  - `@pFechaEstimacion`: Set to the first day of the month associated with the file's data.

### Requirement: Copy SQL to Clipboard
The system SHALL allow the user to copy the generated SQL script easily.

#### Scenario: Copying SQL from the UI
- **WHEN** the user generates the SQL
- **THEN** the system SHALL either copy the script to the clipboard directly or present it in a way that is easily selectable and copyable.

### Requirement: SQL Generation UI
The task row UI SHALL contain a button for SQL generation.

#### Scenario: Button Placement
- **WHEN** viewing the task list rows
- **THEN** each row SHALL include a "Generate SQL" button (or icon) positioned adjacent to the task ID input field.
