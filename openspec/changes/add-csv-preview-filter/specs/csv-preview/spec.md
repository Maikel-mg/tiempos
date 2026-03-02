## ADDED Requirements

### Requirement: User can preview CSV data before SQL generation
The system SHALL allow users to preview all CSV data in a modal dialog before generating the SQL file, enabling informed decisions about which records to import.

#### Scenario: Open preview modal
- **WHEN** user clicks "Preview" button in step 2 of the import wizard
- **THEN** system opens a modal dialog displaying the loaded CSV data in a table format

#### Scenario: Preview shows all columns
- **WHEN** preview modal is opened
- **THEN** all columns from the CSV are displayed in the table with their original headers

### Requirement: Preview displays summary statistics
The preview modal SHALL display summary statistics including total row count and current filtered row count.

#### Scenario: Show total row count
- **WHEN** preview modal is opened
- **THEN** system displays "Total rows: X" where X is the total number of records in the CSV

#### Scenario: Show filtered row count
- **WHEN** user applies a filter in the preview
- **THEN** system displays "Showing X of Y rows" where X is the filtered count and Y is the total

### Requirement: User can filter CSV data in preview
The preview modal SHALL allow users to filter rows by typing in a search box, filtering across all columns.

#### Scenario: Filter by column value
- **WHEN** user types a search term in the filter input
- **THEN** system filters the table to show only rows where any column contains the search term

#### Scenario: Clear filter
- **WHEN** user clears the filter input
- **THEN** system displays all rows again

### Requirement: Preview table is sortable
The preview modal SHALL allow users to sort the table by clicking on column headers.

#### Scenario: Sort ascending
- **WHEN** user clicks a column header that is not currently sorted
- **THEN** system sorts the table by that column in ascending order

#### Scenario: Toggle sort direction
- **WHEN** user clicks a column header that is already sorted ascending
- **THEN** system sorts the table by that column in descending order

#### Scenario: Remove sort
- **WHEN** user clicks a column header that is already sorted descending
- **THEN** system removes the sort and returns to default order

### Requirement: User can select specific process IDs
The preview modal SHALL allow users to select or deselect specific process IDs to include in the import.

#### Scenario: Select individual process
- **WHEN** user clicks the checkbox next to a process ID row
- **THEN** that process is marked as selected for import

#### Scenario: Select all visible processes
- **WHEN** user clicks "Select All" checkbox in the table header
- **THEN** all currently visible (filtered) rows are selected

#### Scenario: Deselect all processes
- **WHEN** user clicks "Deselect All" button
- **THEN** all rows are deselected

### Requirement: Preview table supports pagination
The preview modal SHALL display data in pages to ensure performance with large CSV files.

#### Scenario: Paginate large datasets
- **WHEN** CSV has more than 100 rows
- **THEN** system displays only 100 rows per page with pagination controls

#### Scenario: Navigate between pages
- **WHEN** user clicks "Next" or "Previous" page button
- **THEN** system displays the appropriate set of rows

### Requirement: Modal can be closed
The preview modal SHALL allow users to close it without losing the loaded CSV data.

#### Scenario: Close modal
- **WHEN** user clicks the X button or clicks outside the modal or presses Escape
- **THEN** modal is closed and user returns to step 2

#### Scenario: Data persists after closing
- **WHEN** user closes the preview modal and opens it again
- **THEN** the CSV data is still loaded and any previous selections are remembered
