## ADDED Requirements

### Requirement: Row Selection for Live Data
The system SHALL allow users to select specific time entries from the Live Time Entries view for processing.

#### Scenario: Selecting multiple rows
- **WHEN** the user checks checkboxes on multiple rows in the live data table
- **THEN** the system SHALL track the selection state
- **AND** show the count of selected entries in a badge

#### Scenario: Select/Deselect all rows in current page
- **WHEN** the user clicks the "Select All" checkbox in the table header
- **THEN** all visible rows in the current page SHALL be selected
- **AND** the selection count SHALL update accordingly

### Requirement: SQL Generation from Live Data
The system SHALL generate SQL INSERT statements for the selected live time entries using the current mapping configuration.

#### Scenario: Generate SQL for selected entries
- **WHEN** rows are selected and the user views the SQL Preview section
- **THEN** the system SHALL generate SQL statements for those entries
- **AND** the SQL SHALL use the project name, description, duration, and date from the live entry
- **AND** the system SHALL map the Clockify task name to the database task ID using the current `taskMapping`

### Requirement: Database Execution from Live View
The system SHALL allow direct execution of the generated SQL against the configured database from the Live Time Entries view.

#### Scenario: Execute SQL batch
- **WHEN** the user clicks "Execute in DB"
- **THEN** the system SHALL send the generated statements to the `/api/execute-sql` endpoint
- **AND** show a loading state during execution
- **AND** display the execution result (success message or error details)

### Requirement: Export Live Data to SQL File
The system SHALL allow downloading the generated SQL as a `.sql` file.

#### Scenario: Download SQL file
- **WHEN** the user clicks "Download .sql"
- **THEN** the system SHALL trigger a browser download of a file containing all generated SQL statements
