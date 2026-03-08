## ADDED Requirements

### Requirement: SQL Preview Before Execution
The system SHALL show a preview of SQL before execution, allowing users to review what will be run.

#### Scenario: Preview SQL in modal
- **WHEN** user clicks "Preview" or "Execute" button
- **THEN** the system displays a modal with the SQL that will be executed
- **AND** the SQL is syntax highlighted for readability

#### Scenario: Close preview without executing
- **WHEN** user clicks "X" or "Cancel" in the preview modal
- **THEN** the modal closes
- **AND** no SQL is executed

### Requirement: SQL Execution
The system SHALL execute the generated SQL against the configured database.

#### Scenario: Execute SQL successfully
- **WHEN** user clicks "Execute" in the preview modal
- **THEN** the system sends SQL to the backend endpoint
- **AND** displays loading indicator during execution
- **AND** on success, shows "SQL executed successfully"
- **AND** shows number of rows affected

#### Scenario: Execute SQL with error
- **WHEN** SQL execution fails (syntax error, constraint violation, etc.)
- **THEN** the system displays the error message from the database
- **AND** shows which statement failed if batch SQL

#### Scenario: Execute without connection configured
- **WHEN** user clicks Execute but no connection is configured
- **THEN** the system prompts user to configure connection first
- **AND** redirects to connection settings
