## 1. Update useWizard hook

- [x] 1.1 Modify `handleGenerateSQL` to accept optional `selectedRows` parameter
- [x] 1.2 Filter `csvData.rows` based on selection before generating SQL
- [x] 1.3 Update `goToStep(3)` to preserve selection state

## 2. Refactor Step3Preview component

- [x] 2.1 Add CSV rows table with checkboxes (similar to CSVPreviewModal)
- [x] 2.2 Add search/filter functionality for rows
- [x] 2.3 Add select all / deselect all buttons
- [x] 2.4 Add "X de Y filas seleccionadas" counter

## 3. Add dynamic SQL preview

- [x] 3.1 Create SQL preview panel below the table
- [x] 3.2 Generate SQL on selection change (debounced)
- [x] 3.3 Add formatted/raw toggle
- [x] 3.4 Show stats: processed, errors, total, error rate

## 4. Update action buttons

- [x] 4.1 Update Copy button to copy only selected rows SQL
- [x] 4.2 Update Download button to download only selected rows
- [x] 4.3 Update Execute button to execute only selected rows
- [x] 4.4 Verify error handling shows correct subset

## 5. Test and verify

- [x] 5.1 Test all rows selected = same SQL as current behavior
- [x] 5.2 Test partial selection = correct subset of SQL
- [x] 5.3 Test search/filter preserves selection
- [x] 5.4 Test copy, download, execute with new flow
