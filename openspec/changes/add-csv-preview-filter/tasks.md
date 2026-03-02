## 1. Setup and UI Components

- [x] 1.1 Add "Preview" button to step 2 of the import wizard
- [x] 1.2 Create CSVPreviewModal component with antd Modal
- [x] 1.3 Integrate modal with existing CSV parsing logic

## 2. Table Display

- [x] 2.1 Implement Table component using existing table library (antd Table)
- [x] 2.2 Configure columns dynamically from CSV headers
- [x] 2.3 Add sortable columns functionality
- [x] 2.4 Implement pagination (100 rows per page)

## 3. Filtering

- [x] 3.1 Add search input field above the table
- [x] 3.2 Implement text-based filtering across all columns
- [x] 3.3 Add clear filter button
- [x] 3.4 Display filtered row count vs total row count

## 4. Selection

- [x] 4.1 Add checkbox column to table
- [x] 4.2 Implement individual row selection
- [x] 4.3 Add "Select All" / "Deselect All" buttons
- [x] 4.4 Store selected process IDs in component state

## 5. Statistics and Summary

- [x] 5.1 Display total row count in modal header
- [x] 5.2 Display "Showing X of Y rows" when filtered

## 6. Integration with SQL Generation

- [x] 6.1 Pass selected process IDs to SQL generation step
- [x] 6.2 Verify selected IDs are correctly filtered in generated SQL

## 7. Testing

- [x] 7.1 Test modal open/close functionality
- [x] 7.2 Test filtering with various search terms
- [x] 7.3 Test sorting on different columns
- [x] 7.4 Test pagination navigation
- [x] 7.5 Test selection and deselection
- [x] 7.6 Test that selected IDs are correctly passed to SQL generation
