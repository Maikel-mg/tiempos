## ADDED Requirements

### Requirement: CSV rows table displays in step 3
The system SHALL display the CSV rows in a table format within step 3, similar to the CSV preview modal from step 2.

#### Scenario: Table displays all CSV columns
- **WHEN** user navigates to step 3
- **THEN** system displays a table with all CSV headers as columns
- **AND** each row shows the corresponding data from the CSV

### Requirement: Row selection with checkboxes
The system SHALL allow users to select/deselect individual rows using checkboxes.

#### Scenario: Select single row
- **WHEN** user clicks checkbox on a row
- **THEN** row is marked as selected
- **AND** SQL preview updates to include this row's SQL

#### Scenario: Deselect single row
- **WHEN** user clicks checkbox on an already selected row
- **THEN** row is marked as unselected
- **AND** SQL preview updates to exclude this row's SQL

#### Scenario: Select all rows
- **WHEN** user clicks "Select All" button
- **THEN** all rows become selected
- **AND** SQL preview shows SQL for all rows

#### Scenario: Deselect all rows
- **WHEN** user clicks "Deselect All" button
- **THEN** all rows become unselected
- **AND** SQL preview shows empty or no SQL

### Requirement: Dynamic SQL preview
The system SHALL display a SQL preview panel below the rows table that shows only the SQL for selected rows.

#### Scenario: SQL preview updates on selection change
- **WHEN** user selects or deselects any row
- **THEN** SQL preview automatically updates to show SQL for currently selected rows

#### Scenario: SQL preview shows formatted SQL
- **WHEN** SQL preview displays SQL statements
- **THEN** SQL is formatted with syntax highlighting
- **AND** user can toggle between formatted and raw view

### Requirement: Row filtering and search
The system SHALL allow users to filter rows by searching text in any column.

#### Scenario: Filter rows by search term
- **WHEN** user enters search text
- **THEN** table shows only rows where any column contains the search text
- **AND** selection state is preserved for filtered rows

### Requirement: Import actions
The system SHALL provide action buttons to work with the selected rows' SQL.

#### Scenario: Copy SQL to clipboard
- **WHEN** user clicks "Copy" button
- **THEN** SQL for all selected rows is copied to clipboard
- **AND** visual feedback confirms the copy

#### Scenario: Download SQL file
- **WHEN** user clicks "Download" button
- **THEN** a .sql file is downloaded with SQL for all selected rows

#### Scenario: Execute SQL in database
- **WHEN** user clicks "Execute in BD" button
- **THEN** SQL for all selected rows is executed against the configured database
- **AND** result is displayed (success/failure with message)

### Requirement: Statistics display
The system SHALL display statistics about the selected rows and any errors.

#### Scenario: Show selected count
- **WHEN** rows are selected
- **THEN** display count of selected rows (e.g., "5 de 100 filas seleccionadas")

#### Scenario: Show processing stats
- **WHEN** SQL is generated for selected rows
- **THEN** display: processed count, error count, total count, error rate percentage
