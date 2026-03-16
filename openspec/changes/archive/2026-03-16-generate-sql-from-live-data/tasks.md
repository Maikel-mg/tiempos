## 1. Refactor SQL Generator

- [x] 1.1 Update `sql-generator.js` to support object-based data input alongside indexed rows.
- [x] 1.2 Implement utility functions to convert Clockify ISO durations (e.g., PT1H) and ISO dates to the formats required by the SQL generator.
- [x] 1.3 Verify that the existing CSV import flow still functions correctly with the refactored generator.

## 2. LiveTimeEntriesPage UI Enhancements

- [x] 2.1 Implement row selection state using a Set of entry IDs.
- [x] 2.2 Add checkbox columns to the main table in `LiveTimeEntriesPage`.
- [x] 2.3 Add "Select All" (current page) and "Deselect All" buttons to the header.
- [x] 2.4 Add status badges to display the number of selected entries.

## 3. SQL Actions Implementation

- [x] 3.1 Add a collapsible SQL Preview section to `LiveTimeEntriesPage` similar to `Step3Preview.jsx`.
- [x] 3.2 Implement the "Generate SQL" logic that runs whenever the selection changes.
- [x] 3.3 Add "Copy SQL", "Download .sql", and "Execute in DB" buttons.
- [x] 3.4 Connect the "Execute in DB" button to the `/api/execute-sql` backend endpoint.

## 4. Integration & Validation

- [x] 4.1 Ensure `LiveTimeEntriesPage` correctly loads `taskMapping` and `config` from `localStorage`.
- [x] 4.2 Validate that Clockify task names are correctly mapped to DB IDs using the shared configuration.
- [x] 4.3 End-to-end test: Select live entries, preview SQL, and execute successfully in the target database.
